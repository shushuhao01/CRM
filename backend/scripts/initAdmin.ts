/**
 * 初始化管理员账户脚本
 * 运行: npx ts-node scripts/initAdmin.ts
 */
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crm',
  synchronize: false,
  logging: false
})

async function initAdmin() {
  try {
    await AppDataSource.initialize()
    console.log('数据库连接成功')

    const username = process.argv[2] || 'admin'
    const password = process.argv[3] || 'admin123'
    const email = process.argv[4] || 'admin@example.com'

    // 检查用户是否已存在
    const existing = await AppDataSource.query(
      'SELECT id FROM admin_users WHERE username = ?',
      [username]
    )

    if (existing.length > 0) {
      console.log(`管理员 ${username} 已存在，更新密码...`)
      const hashedPassword = await bcrypt.hash(password, 10)
      await AppDataSource.query(
        'UPDATE admin_users SET password = ?, updated_at = NOW() WHERE username = ?',
        [hashedPassword, username]
      )
      console.log('密码更新成功')
    } else {
      console.log(`创建管理员 ${username}...`)
      const hashedPassword = await bcrypt.hash(password, 10)
      const id = uuidv4()

      await AppDataSource.query(
        `INSERT INTO admin_users (id, username, password, name, email, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'super_admin', 'active', NOW(), NOW())`,
        [id, username, hashedPassword, '超级管理员', email]
      )
      console.log('管理员创建成功')
    }

    console.log('\n管理员信息:')
    console.log(`  用户名: ${username}`)
    console.log(`  密码: ${password}`)
    console.log(`  邮箱: ${email}`)
    console.log(`  角色: super_admin`)

  } catch (error) {
    console.error('初始化失败:', error)
  } finally {
    await AppDataSource.destroy()
  }
}

initAdmin()
