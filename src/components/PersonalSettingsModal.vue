<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="handleClose"
    title="个人设置"
    width="800px"
    :before-close="handleClose"
    class="personal-settings-modal"
  >
    <div class="settings-container">
      <!-- 左侧导航 -->
      <div class="settings-nav">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          class="nav-item"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <el-icon>
            <component :is="tab.icon" />
          </el-icon>
          <span>{{ tab.label }}</span>
        </div>
      </div>

      <!-- 右侧内容 -->
      <div class="settings-content">
        <!-- 个人信息 -->
        <div v-if="activeTab === 'profile'" class="content-section">
          <div class="section-header">
            <h3>个人信息</h3>
            <p>管理您的基本信息和头像</p>
          </div>

          <div class="profile-form">
            <!-- 头像上传 -->
            <div class="avatar-section">
              <div class="avatar-container">
                <el-avatar
                  :src="profileForm.avatar"
                  :size="80"
                  class="user-avatar"
                >
                  <el-icon v-if="!profileForm.avatar"><User /></el-icon>
                </el-avatar>
                <div class="avatar-overlay" @click="handleAvatarClick">
                  <el-icon><Camera /></el-icon>
                  <span>更换头像</span>
                </div>
              </div>
              <input
                ref="avatarInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handleAvatarChange"
              />
            </div>

            <!-- 基本信息表单 -->
            <el-form
              ref="profileFormRef"
              :model="profileForm"
              :rules="profileRules"
              label-width="100px"
              class="profile-info-form"
            >
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="姓名" prop="name">
                    <el-input v-model="profileForm.name" disabled />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="用户名" prop="username">
                    <el-input v-model="profileForm.username" disabled />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="邮箱" prop="email">
                    <el-input v-model="profileForm.email" disabled />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="手机号" prop="phone">
                    <el-input v-model="profileForm.phone" disabled />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="部门">
                    <el-input v-model="profileForm.department" disabled />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="角色">
                    <el-input v-model="profileForm.role" disabled />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-form>

            <div class="form-actions">
              <el-button type="primary" @click="saveProfile" :loading="profileLoading">
                保存更改
              </el-button>
              <el-button @click="resetProfile">重置</el-button>
            </div>
          </div>
        </div>

        <!-- 密码修改 -->
        <div v-if="activeTab === 'password'" class="content-section">
          <div class="section-header">
            <h3>密码修改</h3>
            <p>定期修改密码以保护账户安全</p>
          </div>

          <el-form
            ref="passwordFormRef"
            :model="passwordForm"
            :rules="passwordRules"
            label-width="120px"
            class="password-form"
          >
            <el-form-item label="当前密码" prop="currentPassword">
              <el-input
                v-model="passwordForm.currentPassword"
                type="password"
                placeholder="请输入当前密码"
                show-password
              />
            </el-form-item>

            <el-form-item label="新密码" prop="newPassword">
              <el-input
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="请输入新密码"
                show-password
              />
              <div class="password-strength">
                <div class="strength-bar">
                  <div
                    class="strength-fill"
                    :class="passwordStrengthClass"
                    :style="{ width: passwordStrengthWidth }"
                  ></div>
                </div>
                <span class="strength-text">{{ passwordStrengthText }}</span>
              </div>
            </el-form-item>

            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input
                v-model="passwordForm.confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
                show-password
              />
            </el-form-item>
          </el-form>

          <div class="form-actions">
            <el-button type="primary" @click="changePassword" :loading="passwordLoading">
              修改密码
            </el-button>
            <el-button @click="resetPasswordForm">重置</el-button>
          </div>
        </div>

        <!-- 偏好设置 -->
        <div v-if="activeTab === 'preferences'" class="content-section">
          <div class="section-header">
            <h3>偏好设置</h3>
            <p>个性化您的使用体验</p>
          </div>

          <div class="preferences-form">
            <div class="preference-group">
              <h4>界面设置</h4>
              <div class="preference-item">
                <div class="preference-label">
                  <span>语言</span>
                  <p>选择界面显示语言</p>
                </div>
                <el-select v-model="preferencesForm.language" placeholder="选择语言">
                  <el-option label="简体中文" value="zh-CN" />
                  <el-option label="English" value="en-US" />
                </el-select>
              </div>

              <div class="preference-item">
                <div class="preference-label">
                  <span>时区</span>
                  <p>设置您所在的时区</p>
                </div>
                <el-select v-model="preferencesForm.timezone" placeholder="选择时区">
                  <el-option label="北京时间 (UTC+8)" value="Asia/Shanghai" />
                  <el-option label="东京时间 (UTC+9)" value="Asia/Tokyo" />
                  <el-option label="纽约时间 (UTC-5)" value="America/New_York" />
                </el-select>
              </div>
            </div>

            <div class="preference-group">
              <h4>通知设置</h4>
              <div class="preference-item">
                <div class="preference-label">
                  <span>邮件通知</span>
                  <p>接收重要事件的邮件通知</p>
                </div>
                <el-switch v-model="preferencesForm.emailNotifications" />
              </div>

              <div class="preference-item">
                <div class="preference-label">
                  <span>浏览器通知</span>
                  <p>在浏览器中显示通知</p>
                </div>
                <el-switch v-model="preferencesForm.browserNotifications" />
              </div>

              <div class="preference-item">
                <div class="preference-label">
                  <span>短信通知</span>
                  <p>接收重要事件的短信通知</p>
                </div>
                <el-switch v-model="preferencesForm.smsNotifications" />
              </div>
            </div>

            <div class="preference-group">
              <h4>数据设置</h4>
              <div class="preference-item">
                <div class="preference-label">
                  <span>每页显示条数</span>
                  <p>设置表格默认每页显示的数据条数</p>
                </div>
                <el-select v-model="preferencesForm.pageSize" placeholder="选择条数">
                  <el-option label="10条" :value="10" />
                  <el-option label="20条" :value="20" />
                  <el-option label="50条" :value="50" />
                  <el-option label="100条" :value="100" />
                </el-select>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <el-button type="primary" @click="savePreferences" :loading="preferencesLoading">
              保存设置
            </el-button>
            <el-button @click="resetPreferences">重置</el-button>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Setting, Lock, Bell, Camera } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { passwordService } from '@/services/passwordService'
import { profileApiService, type UpdateProfileRequest, type UserPreferences } from '@/services/profileApiService'

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const userStore = useUserStore()

// 响应式数据
const activeTab = ref('profile')
const profileLoading = ref(false)
const passwordLoading = ref(false)
const preferencesLoading = ref(false)

// 表单引用
const profileFormRef = ref()
const passwordFormRef = ref()
const avatarInput = ref()

// 标签页配置
const tabs = [
  { key: 'profile', label: '个人信息', icon: User },
  { key: 'password', label: '密码修改', icon: Lock }
  // { key: 'preferences', label: '偏好设置', icon: Setting } // 暂时隐藏偏好设置
]

// 个人信息表单
const profileForm = reactive({
  name: '',
  username: '',
  email: '',
  phone: '',
  department: '',
  role: '',
  avatar: ''
})

// 密码表单
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 偏好设置表单
const preferencesForm = reactive({
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  emailNotifications: true,
  browserNotifications: true,
  smsNotifications: false,
  pageSize: 20
})

// 表单验证规则
const profileRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  phone: [
    { pattern: new RegExp('^1[3-9]\\d{9}$'), message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

const passwordRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, message: '密码长度不能少于8位', trigger: 'blur' },
    {
      validator: (rule: unknown, value: string, callback: Function) => {
        if (value && value === passwordForm.currentPassword) {
          callback(new Error(`新密码不能与当前密码相同`))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule: unknown, value: string, callback: Function) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error(`两次输入的密码不一致`))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 密码强度计算
const passwordStrength = computed(() => {
  const password = passwordForm.newPassword
  if (!password) return 0

  let score = 0
  if (password.length >= 8) score += 1
  if (new RegExp('[a-z]').test(password)) score += 1
  if (new RegExp('[A-Z]').test(password)) score += 1
  if (new RegExp('\\d').test(password)) score += 1
  if (new RegExp('[!@#$%^&*(),.?":{}|<>]').test(password)) score += 1

  return score
})

const passwordStrengthClass = computed(() => {
  const strength = passwordStrength.value
  if (strength <= 2) return 'weak'
  if (strength <= 3) return 'medium'
  return 'strong'
})

const passwordStrengthWidth = computed(() => {
  return `${(passwordStrength.value / 5) * 100}%`
})

const passwordStrengthText = computed(() => {
  const strength = passwordStrength.value
  if (strength <= 2) return '弱'
  if (strength <= 3) return '中等'
  return '强'
})

// 方法
const handleClose = () => {
  emit('update:visible', false)
}

const initProfileForm = async () => {
  try {
    const profile = await profileApiService.getProfile()

    // 【批次196修复】确保所有字段都正确赋值
    profileForm.name = profile.name || ''
    profileForm.username = profile.username || ''
    profileForm.email = profile.email || ''
    profileForm.phone = profile.phone || ''
    profileForm.department = profile.department || ''
    profileForm.role = profile.role || ''
    profileForm.avatar = profile.avatar || ''

    console.log('[PersonalSettings] 初始化表单数据:', {
      name: profileForm.name,
      username: profileForm.username,
      email: profileForm.email,
      phone: profileForm.phone,
      department: profileForm.department,
      role: profileForm.role,
      avatar: profileForm.avatar ? '有头像' : '无头像'
    })

    // 同时初始化偏好设置
    Object.assign(preferencesForm, profile.preferences)
  } catch (error) {
    console.error('[PersonalSettings] 初始化个人信息失败:', error)

    // 【批次196修复】使用用户store或localStorage中的数据作为后备
    const user = userStore.user
    if (user) {
      // 优先使用user对象的字段
      profileForm.name = user.realName || user.name || user.username || ''
      profileForm.username = user.username || ''
      profileForm.email = user.email || ''
      profileForm.phone = user.phone || ''
      profileForm.department = user.departmentName || user.department || ''
      profileForm.role = user.roleName || user.role || ''
      profileForm.avatar = user.avatar || ''

      console.log('[PersonalSettings] 使用userStore数据:', {
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        department: profileForm.department
      })
    } else {
      // 如果userStore也没有，尝试从localStorage读取
      try {
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
        if (userInfo.id) {
          profileForm.name = userInfo.realName || userInfo.name || userInfo.username || ''
          profileForm.username = userInfo.username || ''
          profileForm.email = userInfo.email || ''
          profileForm.phone = userInfo.phone || ''
          profileForm.department = userInfo.departmentName || userInfo.department || ''
          profileForm.role = userInfo.roleName || userInfo.role || ''
          profileForm.avatar = userInfo.avatar || ''

          console.log('[PersonalSettings] 使用localStorage数据:', {
            name: profileForm.name,
            email: profileForm.email,
            phone: profileForm.phone,
            department: profileForm.department
          })
        }
      } catch (e) {
        console.error('[PersonalSettings] 读取localStorage失败:', e)
      }
    }
  }
}

const handleAvatarClick = () => {
  avatarInput.value?.click()
}

const handleAvatarChange = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    // 验证文件类型
    if (!file.type.startsWith('image' + '/')) {
      ElMessage.error('请选择图片文件')
      return
    }

    // 验证文件大小 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      ElMessage.error('图片大小不能超过2MB')
      return
    }

    try {
      const avatarUrl = await profileApiService.uploadAvatar(file)
      profileForm.avatar = avatarUrl
      ElMessage.success('头像上传成功')
    } catch (error) {
      console.error('头像上传失败:', error)
      ElMessage.error('头像上传失败，请重试')
    }
  }
}


const saveProfile = async () => {
  try {
    await profileFormRef.value?.validate()
    profileLoading.value = true

    const updateData: UpdateProfileRequest = {
      name: profileForm.name,
      email: profileForm.email,
      phone: profileForm.phone,
      avatar: profileForm.avatar
    }

    await profileApiService.updateProfile(updateData)

    // 【批次195修复】更新 userStore 中的用户信息，使头像和信息实时显示
    if (userStore.user) {
      // 创建更新后的用户对象
      const updatedUser: unknown = {
        ...userStore.user,
        realName: profileForm.name,
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        avatar: profileForm.avatar
      }

      // 更新userStore（使用Object.assign避免类型错误）
      Object.assign(userStore.user, updatedUser)

      // 同时更新 localStorage 中的 user 和 user_info
      localStorage.setItem('user', JSON.stringify(updatedUser))
      localStorage.setItem('user_info', JSON.stringify(updatedUser))

      console.log('[PersonalSettings] 已更新userStore和localStorage')
    }

    ElMessage.success('个人信息保存成功')
    emit('success')
  } catch (error) {
    console.error('保存个人信息失败:', error)
    ElMessage.error('保存个人信息失败，请重试')
  } finally {
    profileLoading.value = false
  }
}

const resetProfile = () => {
  initProfileForm()
  profileFormRef.value?.clearValidate()
}

const changePassword = async () => {
  try {
    await passwordFormRef.value?.validate()
    passwordLoading.value = true

    const result = await passwordService.changePassword({
      userId: userStore.user?.id || 'current',
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword
    })

    if (result.success) {
      ElMessage.success('密码修改成功')
      resetPasswordForm()
      emit('success')
    } else {
      ElMessage.error(result.message || '密码修改失败')
    }
  } catch (error) {
    console.error('密码修改失败:', error)
    ElMessage.error('密码修改失败，请稍后重试')
  } finally {
    passwordLoading.value = false
  }
}

const resetPasswordForm = () => {
  Object.assign(passwordForm, {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  passwordFormRef.value?.clearValidate()
}

const savePreferences = async () => {
  try {
    preferencesLoading.value = true

    const preferences: UserPreferences = {
      language: preferencesForm.language,
      timezone: preferencesForm.timezone,
      emailNotifications: preferencesForm.emailNotifications,
      browserNotifications: preferencesForm.browserNotifications,
      smsNotifications: preferencesForm.smsNotifications,
      pageSize: preferencesForm.pageSize
    }

    await profileApiService.updatePreferences(preferences)

    ElMessage.success('偏好设置保存成功')
    emit('success')
  } catch (error) {
    console.error('保存偏好设置失败:', error)
    ElMessage.error('保存偏好设置失败，请重试')
  } finally {
    preferencesLoading.value = false
  }
}

const resetPreferences = () => {
  Object.assign(preferencesForm, {
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    emailNotifications: true,
    browserNotifications: true,
    smsNotifications: false,
    pageSize: 20
  })
}

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    initProfileForm()
    activeTab.value = 'profile'
  }
})

// 组件挂载时初始化
onMounted(() => {
  initProfileForm()
})
</script>

<style scoped>
.personal-settings-modal {
  .settings-container {
    display: flex;
    min-height: 600px;
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .settings-nav {
    width: 240px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-right: 1px solid #e2e8f0;
    padding: 24px 16px;

    .nav-item {
      display: flex;
      align-items: center;
      padding: 16px 20px;
      margin-bottom: 8px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      font-weight: 500;

      .el-icon {
        margin-right: 12px;
        font-size: 18px;
        transition: transform 0.3s ease;
      }

      span {
        font-size: 15px;
        letter-spacing: 0.3px;
      }

      &:hover {
        background: rgba(64, 158, 255, 0.08);
        transform: translateX(4px);

        .el-icon {
          transform: scale(1.1);
        }
      }

      &.active {
        background: linear-gradient(135deg, #409eff 0%, #3b82f6 100%);
        color: white;
        box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);

        &::before {
          content: '';
          position: absolute;
          left: -16px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 24px;
          background: #409eff;
          border-radius: 2px;
        }
      }
    }
  }

  .settings-content {
    flex: 1;
    padding: 32px 40px;
    background: #ffffff;

    .content-section {
      .section-header {
        margin-bottom: 32px;
        padding-bottom: 16px;
        border-bottom: 2px solid #f1f5f9;

        h3 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        p {
          margin: 0;
          color: #64748b;
          font-size: 15px;
          line-height: 1.6;
        }
      }
    }
  }

  .avatar-section {
    display: flex;
    justify-content: center;
    margin-bottom: 40px;

    .avatar-container {
      position: relative;
      cursor: pointer;

      .user-avatar {
        border: 4px solid #e2e8f0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
      }

      .avatar-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(64, 158, 255, 0.9) 0%, rgba(59, 130, 246, 0.9) 100%);
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        color: white;
        font-size: 13px;
        font-weight: 600;
        backdrop-filter: blur(4px);

        .el-icon {
          font-size: 24px;
          margin-bottom: 6px;
          transform: scale(0.8);
          transition: transform 0.3s ease;
        }
      }

      &:hover {
        .user-avatar {
          border-color: #409eff;
          transform: scale(1.05);
          box-shadow: 0 12px 35px rgba(64, 158, 255, 0.2);
        }

        .avatar-overlay {
          opacity: 1;

          .el-icon {
            transform: scale(1);
          }
        }
      }
    }
  }

  .profile-info-form {
    margin-bottom: 40px;

    :deep(.el-form-item) {
      margin-bottom: 24px;

      .el-form-item__label {
        font-weight: 600;
        color: #374151;
        font-size: 14px;
      }

      .el-input__wrapper {
        border-radius: 8px;
        border: 2px solid #e5e7eb;
        transition: all 0.3s ease;

        &:hover {
          border-color: #d1d5db;
        }

        &.is-focus {
          border-color: #409eff;
          box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
        }
      }
    }
  }

  .password-form {
    max-width: 480px;
    margin-bottom: 40px;

    :deep(.el-form-item) {
      margin-bottom: 24px;

      .el-form-item__label {
        font-weight: 600;
        color: #374151;
        font-size: 14px;
      }

      .el-input__wrapper {
        border-radius: 8px;
        border: 2px solid #e5e7eb;
        transition: all 0.3s ease;

        &:hover {
          border-color: #d1d5db;
        }

        &.is-focus {
          border-color: #409eff;
          box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
        }
      }
    }

    .password-strength {
      margin-top: 12px;

      .strength-bar {
        width: 100%;
        height: 6px;
        background-color: #f1f5f9;
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 8px;

        .strength-fill {
          height: 100%;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 3px;

          &.weak {
            background: linear-gradient(90deg, #ef4444 0%, #f87171 100%);
          }

          &.medium {
            background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
          }

          &.strong {
            background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
          }
        }
      }

      .strength-text {
        font-size: 13px;
        color: #6b7280;
        font-weight: 500;
      }
    }
  }

  .preferences-form {
    .preference-group {
      margin-bottom: 40px;
      background: #f8fafc;
      border-radius: 12px;
      padding: 24px;
      border: 1px solid #e2e8f0;

      h4 {
        margin: 0 0 24px 0;
        font-size: 18px;
        font-weight: 700;
        color: #1e293b;
        display: flex;
        align-items: center;

        &::before {
          content: '';
          width: 4px;
          height: 20px;
          background: linear-gradient(135deg, #409eff 0%, #3b82f6 100%);
          border-radius: 2px;
          margin-right: 12px;
        }
      }

      .preference-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 0;
        border-bottom: 1px solid #e2e8f0;
        transition: all 0.3s ease;

        &:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        &:hover {
          background: rgba(64, 158, 255, 0.02);
          margin: 0 -12px;
          padding: 20px 12px;
          border-radius: 8px;
        }

        .preference-label {
          flex: 1;

          span {
            font-size: 15px;
            font-weight: 600;
            color: #374151;
            display: block;
            margin-bottom: 6px;
          }

          p {
            margin: 0;
            font-size: 13px;
            color: #6b7280;
            line-height: 1.5;
          }
        }

        .el-select {
          width: 220px;

          :deep(.el-input__wrapper) {
            border-radius: 8px;
            border: 2px solid #e5e7eb;
            transition: all 0.3s ease;

            &:hover {
              border-color: #d1d5db;
            }

            &.is-focus {
              border-color: #409eff;
              box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
            }
          }
        }

        .el-switch {
          :deep(.el-switch__core) {
            border-radius: 12px;

            &::after {
              border-radius: 50%;
            }
          }
        }
      }
    }
  }

  /* 全局按钮样式优化 */
  :deep(.el-button) {
    border-radius: 8px;
    font-weight: 600;
    padding: 12px 24px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &.el-button--primary {
      background: linear-gradient(135deg, #409eff 0%, #3b82f6 100%);
      border: none;
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
      }

      &:active {
        transform: translateY(0);
      }
    }

    &.el-button--default {
      border: 2px solid #e5e7eb;
      color: #374151;

      &:hover {
        border-color: #d1d5db;
        background: #f9fafb;
      }
    }
  }

  .form-actions {
    display: flex;
    gap: 12px;
    padding-top: 20px;
    border-top: 1px solid #e4e7ed;
  }
}
</style>
