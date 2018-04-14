const UserDetailModel = require('../models/UserDetailModel.js')
const userDetailModel = new UserDetailModel()
const { LoginCodes, errorRes, serviceError, succRes, CommonCodes } = require('../libs/msgCodes/StatusCodes.js')
const JoiParamVali = require('../libs/JoiParamVali.js')
const { getParamsCheck, postParamsCheck, decrypt, encrypt, geneToken, checkToken } = require('../libs/CommonFun.js')
const { sendCodeFromMail } = require('../libs/mailer.js')
const joiParamVali = new JoiParamVali()

/**
	@UserDetailController
		查询指定addr的用户信息 getUserInfoAndAssetsByAddr
		用户注册,只需要地址与密码即可 userRegister
		账号密码登陆 userLogin
		更改用户密码 changeLoginPwd
		更改用户交易密码 changeTradePwd
		通过用户addr查询用户经纬度 getUserLocationByAddr
	@通过方法
		随机生成地址(经纬度) geneLocation
		发送验证码 geneEmailCode
*/

class UserDetailController {

	/**
   * 用户注册 userRegister
   * @property {string} addr
   * @property {string} pwd
   * @property {string} email 非必要
   * @property {string} code 非必要
   */
	async userRegister (ctx) {
		const paramsType = ['addr', 'pwd', 'email', 'code']
		const params= await postParamsCheck(ctx, paramsType)
		if (!params) return new Error(LoginCodes.Params_Check_Fail)
		const addr = params.addr
		const pwd = params.pwd
		const email = params.email
		const code = params.code
		let tmpCode = null
		const addrVali = await joiParamVali.valiAddr(addr)
		const pwdVali = await joiParamVali.valiPass(pwd)
		console.log(addrVali)
		if (!addrVali || !pwdVali) {
			return new Error(CommonCodes.Params_Check_Fail)
		}
		if (email !== '') {
			const emailVali = await joiParamVali.valiEmail(email)
			if (!emailVali) {
				return new Error(CommonCodes.Params_Check_Fail)
			}
			if (ctx.cookies && ctx.cookies.get('tmpUserId')) {
	      tmpCode = ctx.cookies.get('tmpUserId')
	    }
	    let decryptRes = parseInt(decrypt(tmpCode, email))
	    if (decryptRes - 1 !== code) {
	      return new Error(LoginCodes.Code_Error)  
	    }
		}
		const login = await userDetailModel.userLogin(addr, pwd)
	  if (login && login.length > 0) {
	    return new Error(LoginCodes.Email_Exist)
	  }
	  const location = this.geneLocation()
		const register = await userDetailModel.userRegister(addr, pwd, '', email, ...location)
		if (register) {
			return addr
		} else {
			return new Error(register.message)
		}
	}


	/**
   * 用户登陆 userLogin
   * @property {string} addr
   * @property {string} pwd
   */
	async userLogin (ctx) {
		const addr = ctx.query['addr']
		const pwd = ctx.query['pwd']
		const addrVali = await joiParamVali.valiAddr(addr)
		const pwdVali = await joiParamVali.valiPass(pwd)
		if (!addrVali || !pwdVali) {
			return new Error(CommonCodes.Params_Check_Fail)
		}
		const login = await userDetailModel.userLogin(addr, pwd)
		if (login) {
			return login
		} else {
			return new Error(login.message)
		}
	}

	/**
   * 修改登陆密码 changeLoginPwd
   * @property {string} addr
   * @property {string} oldPwd
   * @property {string} newPwd
   */
	async changeLoginPwd (ctx) {
		const token = ctx.request.headers['token']
		const checkAddr = ctx.cookies.get('userAddr')
		const tokenCheck = await checkToken(token, checkAddr)
		if (!tokenCheck) return new Error(CommonCodes.Token_Fail)
		const paramsType = ['addr', 'oldPwd', 'newPwd']
		const params= await postParamsCheck(ctx, paramsType)
		if (!params) return errorRes(LoginCodes.Params_Check_Fail)
		const addr = params.addr
		const oldPwd = params.oldPwd
		const newPwd = params.newPwd
		const addrVali = await joiParamVali.valiAddr(addr)
		const oldPwdVali = await joiParamVali.valiPass(oldPwd)
		const newPwdVali = await joiParamVali.valiPass(newPwd)
		if (!addrVali || !pwdVali || !newPwd) {
			return new Error(CommonCodes.Params_Check_Fail)
		}
		const oldPwdCheck = await this.userLogin(addr, oldPwd)
		if (!oldPwdCheck) return new Error(oldPwdCheck)
		if (oldPwdCheck.length === 0) return new Error('No such person')
		const newPwdChange = await userDetailModel.changeLoginPwd(addr, newPwd)
		if (newPwdChange) {
			return newPwdChange
		} else {
			return new Error(LoginCodes.Change_Login_Pwd_Fail)
		}
	}

	/**
   * 修改交易密码 changeTradePwd
   * @property {string} addr
   * @property {string} oldPwd
   * @property {string} newPwd
   */
	async changeTradePwd (ctx) {
		const token = ctx.request.headers['token']
		const checkAddr = ctx.cookies.get('userAddr')
		const tokenCheck = await checkToken(token, checkAddr)
		if (!tokenCheck) return new Error(CommonCodes.Token_Fail)
		const paramsType = ['addr', 'oldPwd', 'newPwd', 'code', 'email']
		const params= await postParamsCheck(ctx, paramsType)
		if (!params) return errorRes(LoginCodes.Params_Check_Fail)
		const addr = params.addr
		const oldPwd = params.oldPwd
		const newPwd = params.newPwd
		const code = params.code
		const email = params.email
		const addrVali = await joiParamVali.valiAddr(addr)
		const oldPwdVali = await joiParamVali.valiPass(oldPwd)
		const newPwdVali = await joiParamVali.valiPass(newPwd)
		if (!addrVali || !pwdVali || !newPwd) {
			return new Error(CommonCodes.Params_Check_Fail)
		}
		let tmpCode = null
		if (email) {
			const emailVali = await joiParamVali.valiEmail(email)
			if (!emailVali) {
				return errorRes(CommonCodes.Params_Check_Fail)
			}
			if (ctx.cookies && ctx.cookies.get('tmpUserId')) {
	      tmpCode = ctx.cookies.get('tmpUserId')
	    }
	    let decryptRes = parseInt(decrypt(tmpCode, email))
	    if (decryptRes - 1 !== code) {
	      return errorRes(LoginCodes.Code_Error)  
	    }
		}
		const newPwdChange = await userDetailModel.changeTradePwd(addr, newPwd)
		if (newPwdChange) {
			return newPwdChange
		} else {
			return new Error(LoginCodes.Change_Trade_Pwd_Fail)
		}
	}

	/**
   * 通过用户addr查询用户经纬度 changeTradePwd
   * @property {string} addr
   */
	async getUserLocationByAddr (ctx) {
		const addr = ctx.query['addr']
		const addrVali = await joiParamVali.valiAddr(addr)
		if (!addrVali) {
			return new Error(CommonCodes.Params_Check_Fail)
		}
		const location = await userDetailModel.getUserLocationByAddr(addr)
		if (location) {
			return location
		} else {
			return new Error(location)
		}
	}

	/**
   * 通过用户addr查询用户详细信息 getUserInfoAndAssetsByAddr
   * @property {string} addr
   */
	async getUserInfoAndAssetsByAddr (ctx) {
		const token = ctx.request.headers['token']
		const checkAddr = ctx.cookies.get('userAddr')
		const tokenCheck = await checkToken(token, checkAddr)
		if (!tokenCheck) return new Error(CommonCodes.Token_Fail)
		const addr = ctx.query['addr']
		const addrVali = await joiParamVali.valiAddr(addr)
		if (!addrVali) {
			return new Error(CommonCodes.Params_Check_Fail)
		}
		const userInfo = await userDetailModel.queryUserByAddr(addr)
		if (userInfo) {
			return userInfo[0]
		} else {
			return new Error(LoginCodes.Service_Wrong)
		} 
	}

	geneLocation () {
		return [123.1, -23.5]
	}
}

module.exports = UserDetailController