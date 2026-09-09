<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { BaseButton, BaseInput, PopConfirm, Toast } from '@/base'
import SettingItem from './SettingItem.vue'
import { useUserStore } from '@/core/stores/user'
import { useRuntimeStore } from '@/core/stores/runtime'
import { useExport } from '@/core/hooks/export'
import { useDataSyncPersistence } from '@/core/composables/useDataSyncPersistence'
import { Supabase, resolveSupabaseCredentials } from '@/core/utils/supabase'
import { SyncDataType } from '@/core/types/enum'
import { SAVE_DICT_KEY } from '@/core/config/env'
import { get } from 'idb-keyval'
import BackupGateDialog from '@/components/dialog/BackupGateDialog.vue'

const Dialog = defineAsyncComponent(() => import('@/base/dialog/Dialog.vue'))

const { t } = useI18n()
const userStore = useUserStore()
const runtimeStore = useRuntimeStore()
const dataSync = useDataSyncPersistence()
const { getExportedData } = useExport()

const email = ref('')
const password = ref('')
const authLoading = ref(false)
const showAdvanced = ref(false)
const showConflict = ref(false)
const conflictLoading = ref(false)
const showBackupGate = ref(false)
const pendingAdvancedAction = ref<'save' | 'remove' | ''>('')
const configLoading = ref(false)

const credsTick = ref(0)
const credentials = computed(() => {
  credsTick.value
  return resolveSupabaseCredentials()
})
const officialReady = computed(() => !!credentials.value)
const status = computed(() => Supabase.getStatus())

const customForm = ref({
  url: Supabase.getConfig()?.url ?? '',
  key: Supabase.getConfig()?.key ?? '',
})

async function handleAuthError(error: unknown) {
  const msg = (error as Error)?.message ?? String(error)
  Toast.error(msg)
}

async function afterLogin() {
  Supabase.setStatus('success')
  runtimeStore.isError = false
  const isFirstOnDevice = userStore.consumeFirstLoginOnDevice()
  if (!isFirstOnDevice) {
    const dictData = await get(SAVE_DICT_KEY.key)
    if (dictData) {
      try {
        const parsed = JSON.parse(dictData)
        await dataSync.syncData({
          [SyncDataType.dict]: parsed,
          [SyncDataType.setting]: null,
        })
      } catch {
        // ignore parse errors; local data remains
      }
    }
    Toast.success(t('auth_login_success'))
    return
  }

  const remote = await dataSync.getRemoteMeta(SyncDataType.dict)
  const localRaw = await get(SAVE_DICT_KEY.key)
  const hasRemote = remote?.data_version != null
  const hasLocal = !!localRaw

  if (hasRemote && hasLocal) {
    showConflict.value = true
    return
  }
  if (hasRemote) {
    const ok = await dataSync.pullAllRemoteToLocal()
    Toast.success(ok ? t('pull_remote_success') : t('pull_remote_failed'))
    return
  }
  const localData = await getExportedData()
  const ok = await dataSync.forcePushLocalDataToRemote(localData.val)
  Toast.success(ok ? t('push_local_success') : t('push_local_failed'))
}

async function login() {
  if (authLoading.value) return
  authLoading.value = true
  try {
    await userStore.signIn(email.value.trim(), password.value)
    await afterLogin()
  } catch (error) {
    await handleAuthError(error)
  } finally {
    authLoading.value = false
  }
}

async function register() {
  if (authLoading.value) return
  authLoading.value = true
  try {
    const data = await userStore.signUp(email.value.trim(), password.value)
    if (!data.session) {
      Toast.success(t('auth_register_check_email'))
      return
    }
    await afterLogin()
  } catch (error) {
    await handleAuthError(error)
  } finally {
    authLoading.value = false
  }
}

async function logout() {
  await userStore.signOut()
  Toast.success(t('auth_logout_success'))
}

async function logoutAndClear() {
  await dataSync.clearLocalOnly()
  await userStore.signOut()
  Toast.success(t('auth_logout_clear_success'))
}

async function onConflictChoice(action: 'push_local' | 'pull_remote') {
  if (conflictLoading.value) return
  conflictLoading.value = true
  try {
    if (action === 'push_local') {
      const localData = await getExportedData()
      const ok = await dataSync.forcePushLocalDataToRemote(localData.val)
      if (!ok) throw new Error(t('push_local_failed'))
      Toast.success(t('push_local_success'))
    } else {
      const ok = await dataSync.pullAllRemoteToLocal()
      if (!ok) throw new Error(t('pull_remote_failed'))
      Toast.success(t('pull_remote_success'))
    }
    showConflict.value = false
  } catch (error) {
    await handleAuthError(error)
  } finally {
    conflictLoading.value = false
  }
}

function openAdvancedGate(action: 'save' | 'remove') {
  pendingAdvancedAction.value = action
  showBackupGate.value = true
}

async function saveCustomConfig() {
  if (configLoading.value) return
  showBackupGate.value = false
  configLoading.value = true
  try {
    Supabase.saveConfig(customForm.value.url.trim(), customForm.value.key.trim())
    credsTick.value++
    Toast.success(t('save_success'))
  } catch (error) {
    await handleAuthError(error)
  } finally {
    configLoading.value = false
  }
}

function removeCustomConfig() {
  showBackupGate.value = false
  Supabase.removeConfig()
  customForm.value = { url: '', key: '' }
  credsTick.value++
  Toast.success(t('clear_success'))
}
</script>

<template>
  <div>
    <SettingItem :title="$t('auth_official_sync')" :desc="$t('auth_login_desc')">
      <div v-if="status.status === 'error'" class="text-red text-sm">
        {{ $t('sync_status_failed') }}{{ status.statusMessage ? `（${status.statusMessage}）` : '' }}
      </div>
      <div v-else-if="userStore.isLoggedIn" class="text-green text-sm">{{ $t('sync_status_running') }}</div>
    </SettingItem>

    <div v-if="!officialReady" class="text-orange-500 mb-4">{{ $t('auth_official_not_configured') }}</div>

    <div v-if="userStore.isLoggedIn" class="flex flex-col gap-3 mb-6">
      <div>
        {{ $t('auth_logged_in_as') }}
        <strong>{{ userStore.email }}</strong>
      </div>
      <div class="flex gap-2 flex-wrap">
        <BaseButton size="large" @click="logout">{{ $t('auth_logout') }}</BaseButton>
        <PopConfirm :title="$t('auth_logout_clear_confirm')" @confirm="logoutAndClear">
          <BaseButton size="large">{{ $t('auth_logout_and_clear') }}</BaseButton>
        </PopConfirm>
      </div>
    </div>

    <div v-else class="max-w-120 mb-6">
      <SettingItem :title="$t('auth_email')">
        <BaseInput v-model="email" type="email" autocomplete="email" class="w-60" />
      </SettingItem>
      <SettingItem :title="$t('auth_password')">
        <BaseInput v-model="password" type="password" autocomplete="current-password" class="w-60" />
      </SettingItem>
      <div class="flex justify-end gap-2">
        <BaseButton size="large" :loading="authLoading" :disabled="!officialReady" @click="register">{{
          $t('auth_register')
        }}</BaseButton>
        <BaseButton size="large" :loading="authLoading" :disabled="!officialReady" @click="login">{{
          $t('auth_login')
        }}</BaseButton>
      </div>
    </div>

    <div class="line my-3"></div>
    <div class="cursor-pointer color-link mb-3" @click="showAdvanced = !showAdvanced">
      {{ $t('auth_advanced_self_host') }}
    </div>
    <div v-if="showAdvanced">
      <div class="mb-4 text-sm color-gray">{{ $t('supabase_config_desc') }}</div>
      <SettingItem title="Url">
        <BaseInput v-model="customForm.url" class="w-80" />
      </SettingItem>
      <SettingItem title="Key">
        <BaseInput v-model="customForm.key" class="w-80" />
      </SettingItem>
      <div class="flex justify-end gap-2">
        <BaseButton size="large" @click="openAdvancedGate('remove')">{{ $t('delete_config') }}</BaseButton>
        <BaseButton size="large" :loading="configLoading" @click="openAdvancedGate('save')">{{
          $t('save_config')
        }}</BaseButton>
      </div>
    </div>

    <Dialog v-model="showConflict" :title="$t('remote_data_detected_title')">
      <div class="p-4 w-120">
        <div>{{ $t('remote_data_detected_desc') }}</div>
        <div class="color-gray mt-2">{{ $t('push_local_desc') }}</div>
        <div class="color-gray">{{ $t('pull_remote_desc') }}</div>
        <div class="flex justify-end mt-4 gap-2">
          <BaseButton size="large" :loading="conflictLoading" @click="onConflictChoice('push_local')">{{
            $t('push_local')
          }}</BaseButton>
          <BaseButton size="large" :loading="conflictLoading" @click="onConflictChoice('pull_remote')">{{
            $t('pull_remote')
          }}</BaseButton>
        </div>
      </div>
    </Dialog>

    <BackupGateDialog v-model="showBackupGate">
      <template v-slot="{ disabled }">
        <BaseButton
          v-if="pendingAdvancedAction === 'save'"
          size="large"
          :disabled="disabled"
          :loading="configLoading"
          @click="saveCustomConfig"
        >
          {{ $t('save_config') }}
        </BaseButton>
        <BaseButton v-else size="large" :disabled="disabled" @click="removeCustomConfig">
          {{ $t('delete_config') }}
        </BaseButton>
      </template>
    </BackupGateDialog>
  </div>
</template>
