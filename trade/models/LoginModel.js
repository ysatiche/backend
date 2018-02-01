const Db = require('./Db.js')
const db = new Db()
const mysql = require('mysql')
/*
	table: user
	colume: 
		- uid 用户id
		- uemail 用户注册邮箱
		- upwd 用户登陆密码
		- utradePwd 用户交易密码
		- ustate 用户状态
*/

class LoginModel {
	
	// 查询数据库中所有数据
	async selectAllData () {
		let sql = 'SELECT * FROM user'
		return await db.query(sql)
	}

	// 查询指定email的用户信息
	async queryUserByEmail (email) {
		let columns = ['uid', 'uemail', 'ustate']
		let val = [columns, 'user', email]
		let sql = 'SELECT ?? FROM ?? WHERE uemail = ?'
		return await db.query(sql, val)
	}

	// 插入注册用户数据
	async insertUser (email, pwd) {
		let insertData = {
			uemail: email,
			upwd: pwd,
			utradePwd: '',
			ustate: 'registed'
		}
		let sql = 'INSERT INTO user SET ?'
		return await db.query(sql, insertData)
	}

	// 账号密码登陆
	async userLogin (email, pwd) {
		let columns = ['uid', 'uemail', 'upwd', 'utradePwd', 'ustate']
		let val = [columns, 'user', email, pwd]
		let sql = 'SELECT ?? FROM ?? WHERE uemail= ? && upwd= ?'
		return await db.query(sql)
	}

	// 更改用户密码
	async changeLoginPwd (mail, newPwd) {
		let sql = 'UPDATE user SET upwd=' + mysql.escapeId(newPwd) + ' WHERE umail=' + mysql.escapeId(mail)
		return await db.query(sql)
	}

	// 更改用户交易密码
	async changeTradePwd (mail, newPwd) {
		let sql = 'UPDATE user SET utradePwd=' + mysql.escapeId(newPwd) + ' WHERE umail=' + mysql.escapeId(mail)
		return await db.query(sql)
	}

	/**
	 用户状态更改
	 	- 用户注册
	 	- 用户认证
	 	- 用户注销
	 */ 
  async updateUserState (email, newState) {
  	let sql = 'UPDATE user SET ustate=' + mysql.escapeId(newState) + ' WHERE umail=' + mysql.escapeId(mail)
		return await db.query(sql)
  }
}

module.exports = LoginModel
