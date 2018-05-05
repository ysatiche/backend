const crypto = require('crypto')
const _ = require('lodash')
const async = require('async')
const PandaOwnerModel = require('../models/PandaOwnerModel.js')
const pandaOwnerModel = new PandaOwnerModel()
const JoiParamVali = require('../libs/JoiParamVali.js')
const joiParamVali = new JoiParamVali()
const { getParamsCheck, postParamsCheck, decrypt, cacl, encrypt, geneToken, checkToken } = require('../libs/CommonFun.js')
const { PandaOwnerClientModel, AttrList } = require('../sqlModel/pandaOwner.js')
const { PandaOwnerCodes, AssetsCodes, errorRes, CommonCodes, PandaLandCodes, serviceError, succRes } = require('../libs/msgCodes/StatusCodes.js')

/*
  PandaOwnerController:
   - land
   	- 丢弃熊猫 delPandaByGen
   	- 产生一只熊猫
   		- 新用户获取G10熊猫 genePandaRandom
   		- 繁殖熊猫	sireNewPanda
   		- 用竹子孕育熊猫 producePandaByBamboo
   	- 熊猫外出时属性增强 updatePandaAttr
   	- 外出逻辑 getEthlandProduct
   	- 熊猫的等级积分更新 
   	- 查询特定熊猫详细信息 queryPandaInfo
   	- 查询某个addr下所有熊猫 queryAllPandaByAddr
   	- 查询熊猫外出回归带的物品 getPandaBackAssets
   	- 出售熊猫 sellPanda
   	- 购买熊猫 buyPanda
   	- 孵化熊猫 sirePanda
   - market
   	- 查询当前所有待售熊猫 queryAllPandaBeSold
   	- 购买熊猫 buyMarketPanda
   - 辅助函数
   	- 随机属性产生 geneAttr
   	- 固定范围内随机值产生 geneAttrVal
   	- 繁殖后代时属性值混合产生 mixAttrBySire
   	- 繁殖后代时type混合产生 mixTypeBySire
   	- 校验参数是否合法 valiParams
   	- 商品中心与熊猫外出时范围计算 recognize
   	- 返回不同属性的商品中心地址 getDiffStarCenter
*/

let bambooTitudeRate = 1000 // 竹子/经纬度 比例
let currentEthPrice = 3000
let currentBambooPrice = 1
let currentWaterPrice = 3

class PandaOwnerController {
	constructor () {
	}

	// 根据熊猫基因查询熊猫
	async queryPandaInfo (ctx) {
		const token = ctx.request.headers['token']
		const checkAddr = ctx.cookies.get('userAddr')
		const tokenCheck = await checkToken(token, checkAddr)
		if (!tokenCheck) return new Error(CommonCodes.Token_Fail)
		const gen = ctx.query['gen']
		const genVali = await joiParamVali.valiPandaGeni(gen)
		if (!genVali) {
			return new Error(CommonCodes.Params_Check_Fail)
		}
		const pandaInfo = await pandaOwnerModel.queryPandaInfo(gen)
		return pandaInfo
	}

	async queryAllPandaByAddr (ctx) {
		const token = ctx.request.headers['token']
		const checkAddr = ctx.cookies.get('userAddr')
		const tokenCheck = await checkToken(token, checkAddr)
		if (!tokenCheck) return new Error(CommonCodes.Token_Fail)
		const addr = ctx.query['addr']
		const addrVali = await joiParamVali.valiAddr(addr)
		if (!addrVali) {
			return new Error(CommonCodes.Params_Check_Fail)
		}
		const allPanda = await pandaOwnerModel.queryAllPandaByAddr(addr)
		if (!allPanda) return new Error(allPanda.message)
		return allPanda
	}

	async getPandaBackAssets (ctx) {
		const token = ctx.request.headers['token']
		const checkAddr = ctx.cookies.get('userAddr')
		const tokenCheck = await checkToken(token, checkAddr)
		if (!tokenCheck) return new Error(CommonCodes.Token_Fail)
		// const gen = ctx.query['pandaGen']
		// const genVali = await joiParamVali.valiPandaGeni(gen)
		// if (!genVali) {
		// 	return new Error(CommonCodes.Params_Check_Fail)
		// }
		const allOutPanda = await pandaOwnerModel.queryAllOutPandaByAddr(checkAddr)
		if (!allOutPanda || allOutPanda.length === 0) return new Error(PandaOwnerCodes.Not_Out_Panda)
		let backProducts = [] // 返回的所有商品
		let dropProducts = [] // 扔掉的所有商品
		let dropTypeTmpObj = {} // 返回的商品计算中间对象
		let backTypeTmpObj = {} // 扔掉的商品计算中间对象
		let resProducts = [] // 返回的最终商品数组
		let dropResProducts = [] // 扔掉的最终商品数组
		let backPandas = [] // 返回的panda基因
		const curDate =  Date.parse(new Date()) / 1000 // 当前时间
		for (let panda of allOutPanda) {
			if (curDate > panda.price) {
				const backPanda = await pandaOwnerModel.pandaBackHome(panda.pandaGen)
				if (!backPanda) return backPanda
				const backAssets = await pandaOwnerModel.getPandaBackAssets(panda.pandaGen)
				if (!backAssets) return backAssets
				backPandas.push(panda.pandaGen)
				if (backAssets[0].backAssets) {
					const backAssetsArr = backAssets[0].backAssets.split('|')
					if (backAssetsArr.length > 0) {
						backProducts = backProducts.concat(backAssetsArr)
					}
				}
				if (backAssets[0].dropAssets) {
					const dropAssetsArr = backAssets[0].dropAssets.split('|')
					if (dropAssetsArr.length > 0) {
						dropProducts = dropProducts.concat(dropAssetsArr)
					}
				}
			}
		}
		// 带回去的商品
		if (backProducts.length > 0) {
			backProducts.forEach(function(x) { 
				backTypeTmpObj[x] = (backTypeTmpObj[x] || 0) + 1
			})
			const typeArr = Object.keys(backTypeTmpObj)
			for (let type of typeArr) {
				const imgInfo = await pandaOwnerModel.queryLandProductInfo(type)
				if (!imgInfo) return imgInfo
				const item = {
					productId: type,
					imgSrc: imgInfo[0].imgSrc,
					value: backTypeTmpObj[type]
				}
				resProducts.push(item)
			}
		}
		// 扔掉的商品
		if (dropProducts.length > 0) {
			dropProducts.forEach(function(x) { 
				dropTypeTmpObj[x] = (dropTypeTmpObj[x] || 0) + 1
			})
			const droptypeArr = Object.keys(dropTypeTmpObj)
			for (let type of droptypeArr) {
				const imgInfo = await pandaOwnerModel.queryLandProductInfo(type)
				if (!imgInfo) return imgInfo
				const item = {
					productId: type,
					imgSrc: imgInfo[0].imgSrc,
					value: dropTypeTmpObj[type]
				}
				dropResProducts.push(item)
			}
		}
		return {
			resProducts: resProducts,
			dropProducts: dropResProducts,
			backPandas: backPandas
		}
	}

	// 增加熊猫对某种属性的探测属性
	async updatePandaAttr (attr, value, pandaGen) {
		const attrTypeVali = await joiParamVali.valiState(attr, AttrList)
		const valVali = [
			{
				val: pandaGen,
				model: PandaOwnerClientModel.pandaGeni
			},
			{
				val: value,
				model: PandaOwnerClientModel.goldCatch
			}
		]
		if (!attrTypeVali && !valVali) return
		return pandaOwnerModel.updatePandaAttr(attr, value, pandaGen)
		.then(v => {
			return succRes('updatePandaAttr', v)
		})
		.catch(e => {
			console.log(e)
			return serviceError()
		})
	}

	async queryAllPandaBeSold (ctx) {
		const token = ctx.request.headers['token']
		const checkAddr = ctx.cookies.get('userAddr')
		const tokenCheck = await checkToken(token, checkAddr)
		if (!tokenCheck) return new Error(CommonCodes.Token_Fail)
		const soldPanda = await pandaOwnerModel.queryPandasByState('sold')
		return soldPanda
	}

	buyMarketPanda (addr, pandaGen) {
		return pandaOwnerModel.transferPandaOwner(addr, pandaGen)
		.then(v => {
			return succRes('buyMarketPanda', v)
		})
		.catch(e => {
			console.log(e)
			return serviceError()
		})
	}

	// 随机产生一只G10的熊猫
	async genePandaRandom (ctx) {
		const token = ctx.request.headers['token']
		const checkAddr = ctx.cookies.get('userAddr')
		const tokenCheck = await checkToken(token, checkAddr)
		if (!tokenCheck) return new Error(CommonCodes.Token_Fail)
		const addr = ctx.query['addr']
		const addrVali = await joiParamVali.valiAddr(addr)
		if (!addrVali) {
			return new Error(CommonCodes.Params_Check_Fail)
		}
		const pandaCount = await pandaOwnerModel.queryAllPandaByAddr(addr)
		console.log('pandaCount', pandaCount)
		if (pandaCount && pandaCount.length > 0) {
			return new Error(PandaOwnerCodes.Already_Gene_Free_Panda)
		} 
		let geni = ''
		let pandaAttr = null
		let spAttr = []
		pandaAttr = this.geneAttr()
		let genTypeNum = 5
		let integral = this.geneAttrVal(30)
		for (let i = 0; i < genTypeNum; i++) {
			geni += this.geneNumRandom()
		}
		// geni = crypto.createHash('sha256').update(geni).digest()
		for (let i = 0; i < 7; i++) {
			if (i === parseInt(pandaAttr.index)) {
				spAttr.push(this.geneAttrVal(30))
			} else {
				spAttr.push(this.geneAttrVal(20))
			}
		}
		const genePanda = await pandaOwnerModel.genePanda(geni, addr, pandaAttr.type, ...spAttr, '', integral, 'egg', 0)
		return genePanda
	}

	async sirePanda (ctx) {
		const token = ctx.request.headers['token']
		const checkAddr = ctx.cookies.get('userAddr')
		const tokenCheck = await checkToken(token, checkAddr)
		if (!tokenCheck) return new Error(CommonCodes.Token_Fail)
		const gen = ctx.query['pandaGen']
		const genVali = await joiParamVali.valiPandaGeni(gen)
		if (!genVali) {
			return new Error(CommonCodes.Params_Check_Fail)
		}
		const sirePanda = await pandaOwnerModel.pandaBackHome(gen)
		return sirePanda
	}

	sireNewPanda (fPanda, mPanda) {
		let newPandaAddr = Math.random() < 0.5 ? fPanda.ownerAddr : mPanda.ownerAddr
		let type = this.mixTypeBySire(fPanda.type, mPanda.type)
		let attrArr = ['speed', 'hungry', 'goldCatch', 'waterCatch', 'fireCatch', 'earthCatch', 'woodCatch']
		let attrValArr = []
		let integral = 0
		let rate = parseFloat(Math.random().toFixed(3))
		integral = parseInt(fPanda.integral * rate + mPanda.integral * (1-rate))
		for (let i = 0; i < attrArr.length; i++) {
			let attrVal = this.mixAttrBySire(fPanda[attrArr[i]], mPanda[attrArr[i]])
			attrValArr.push(attrVal)
		}
		return pandaOwnerModel.genePanda('0x789', newPandaAddr, type, ...attrValArr, '', integral, 'home', 0)
		.then(v => {
			return succRes('genePanda', v)
		})
		.catch(e => {
			console.log(e)
			return serviceError()
		})
	}

	producePandaByBamboo () {
  	
  }

	// 0~10随机数产生
	geneNumRandom () {
		let num = parseInt(Math.random() * 10)
		if (num < 10) {
			return '00' + num
		} else {
			return '010'
		}
	}

	// 属性值随机数产生
	geneAttrVal (val) {
		return parseInt(Math.random() * val) / 100
	}

	// 属性类型随机数产生
	geneAttr () {
		let val = parseInt(Math.random() * 10)
		let type = ''
		let index = 2
		if (val <= 0) {
			type = 'gold'
		} else if(val < 2) {
			type = 'water'
			index = 3
		} else if (val < 5) {
			type = 'wood'
			index = 4
		} else if (val < 7) {
			type = 'fire'
			index = 5
		} else{
			type = 'earth'
			index = 6
		}
		return {
			type: type,
			index: index
		}
	}

	async sellPanda (ctx) {
		const token = ctx.request.headers['token']
		const checkAddr = ctx.cookies.get('userAddr')
		const tokenCheck = await checkToken(token, checkAddr)
		if (!tokenCheck) return new Error(CommonCodes.Token_Fail)
		const gen = ctx.query['pandaGen']
		const price = ctx.query['price']
		// const tradePwd = ctx.query['tradePwd']
		const genVali = await joiParamVali.valiPandaGeni(gen)
		const priceVali = await joiParamVali.valiAttr(price)
		// const pwdVali = await joiParamVali.valiPass(tradePwd)
		if (!genVali || !priceVali) {
			return new Error(CommonCodes.Params_Check_Fail)
		}
		// const checkPwd = await pandaOwnerModel.checkOwnerTradePwd(gen, tradePwd)
		// if (!checkPwd) return checkPwd
		const sellPanda = await pandaOwnerModel.sellPanda(gen, price)
		return sellPanda
	}

  queryPandaBeSold () {
  	return pandaOwnerModel.genePandaRandom(geni, addr, pandaAttr.type, ...spAttr, '', integral)
		.then(v => {
			return succRes('genePandaRandom', v)
		})
		.catch(e => {
			console.log(e)
			return serviceError()
		})
  }

  async delPandaByGen (ctx) {
  	const token = ctx.request.headers['token']
		const checkAddr = ctx.cookies.get('userAddr')
		const tokenCheck = await checkToken(token, checkAddr)
		if (!tokenCheck) return new Error(CommonCodes.Token_Fail)
		const gen = ctx.query['pandaGen']
		// const tradePwd = ctx.query['tradePwd']
		const genVali = await joiParamVali.valiPandaGeni(gen)
		// const pwdVali = await joiParamVali.valiPass(tradePwd)
		if (!genVali) {
			return new Error(CommonCodes.Params_Check_Fail)
		}
		// const checkPwd = await pandaOwnerModel.checkOwnerTradePwd(gen, tradePwd)
		// if (!checkPwd) return checkPwd
		const dropPanda = await pandaOwnerModel.delPandaByGen(gen)
		return dropPanda
  }
  mixAttrBySire (fathVal, mathVal) {
  	let rate = parseFloat(Math.random().toFixed(3))
  	return fathVal * rate + (1 - rate) * mathVal
  }

  mixTypeBySire (fathVal, mathVal) {
  	let fathTypeArr = fathVal.split('|')
  	let mathTypeArr = mathVal.split('|')
  	for (let i = 0; i < mathTypeArr.length; i++) {
  		if (fathTypeArr.indexOf(mathTypeArr[i]) === -1) {
  			fathTypeArr.push(mathTypeArr[i])
  		}
  	}
  	return fathTypeArr.join('|')
  }

  async valiParams (params) {
		for (let param of params) {
			await joiParamVali[param.model.type](param.val)
		}
		return true
  }

  async buyPanda (addr, pandaGen, price) {
		const token = ctx.request.headers['token']
		const checkAddr = ctx.cookies.get('addr')
		const tokenCheck = await checkToken(token, checkAddr)
		if (!tokenCheck) return new Error(CommonCodes.Token_Fail)
		const pandaInfo = await pandaOwnerModel.queryPandaInfo(pandaGen)
		if (!pandaInfo || pandaInfo[0].state !== 'sold') return new Error(PandaLandCodes.Panda_Not_Sold)
		const ownerAddr = pandaInfo[0].ownerAddr
		const bamboo = pandaInfo[0].bamboo
		const assets = await pandaOwnerModel.queryAssetsByAddr(addr)
		if (!assets || assets[0].bamboo < price) return new Error(PandaLandCodes.No_More_Bamboo_For_Out)
		const buyBamboo = assets[0].bamboo
		let buyleft = parseFloat(buybamboo) - parseFloat(price) > 0 ? parseFloat(buybamboo) - parseFloat(price): 0
		let ownerleft = parseFloat(ownerbamboo) + parseFloat(price)
		const updateAssets = await pandaOwnerModel.updateAssetsByAddr(addr, buyleft, ownerAddr, ownerleft)
		if (!updateAssets) return new Error(PandaLandCodes.Buy_Panda_Fail)
		return updateAssets
	}

	async getEthlandProduct (ctx, starArr) {
		// const token = ctx.request.headers['token']
		// const checkAddr = ctx.cookies.get('userAddr')
		// const tokenCheck = await checkToken(token, checkAddr)
		// if (!tokenCheck) return new Error(CommonCodes.Token_Fail)
		const paramsType = ['pandaGen', 'bamboo', 'direction']
		const params= await getParamsCheck(ctx, paramsType)
		if (!params) return new Error(CommonCodes.Params_Check_Fail)
		// console.log('params', params)
		const self = this
		const geni = params.pandaGen
		const bamboo = params.bamboo
		const direction = params.direction
		const geniVali = await joiParamVali.valiPandaGeni(geni)
		const bambooVali = await joiParamVali.valiBamboo(bamboo)
		const directionVali = await joiParamVali.valiDir(direction)
		if (!geniVali || !bambooVali || !directionVali) {
			return new Error(CommonCodes.Params_Check_Fail)
		}
		const trans = await pandaOwnerModel.startTransaction()
		if (!trans) return new Error(CommonCodes.Service_Wrong)
		// console.log('trans begin!')
		// const assetsValArr = await pandaOwnerModel.queryCurrentAssetsVal()
		// if (!assetsValArr || assetsValArr.length === 0) return new Error(AssetsCodes.Assets_Null)
		let tasks = [
			async function () {
				const pandaInfo = await pandaOwnerModel.getInfoForProduct(trans, geni)
				if (!pandaInfo || pandaInfo.length === 0) return new Error(PandaLandCodes.No_Such_Panda)
				if (parseInt(pandaInfo[0].bamboo) < bamboo) return new Error(PandaLandCodes.No_More_Bamboo_For_Out)
				let leftBamboo = parseInt(pandaInfo[0].bamboo) - bamboo
				const updateLandAssets = await pandaOwnerModel.updateLandAssetsByAddrTrans(trans, pandaInfo[0].ownerAddr, 'bamboo', leftBamboo)
				if (!updateLandAssets) return new Error(CommonCodes.Service_Wrong)
				// console.log('pandaInfo', pandaInfo[0])
				return pandaInfo[0]
			},
			async function (pandaInfo) {
				if (_.isError(pandaInfo)) return pandaInfo
				let baseRate = parseFloat(bamboo / bambooTitudeRate)
				let addr = pandaInfo.ownerAddr
				let geoParams = cacl(pandaInfo.longitude, pandaInfo.latitude, baseRate, direction, pandaInfo.hungry, pandaInfo.speed)
				// const product = await pandaOwnerModel.findProductByGeo(trans, geoParams.longitude, geoParams.latitude, geoParams.width, geoParams.height)
				const product = await pandaOwnerModel.findAllproduct()
				if (!product || product.length === 0) return new Error(PandaLandCodes.No_Product_In_Land)
				let attrArr = {
          'speed': parseFloat(pandaInfo.speed),
          'hungry': parseFloat(pandaInfo.hungry),
          'gold': pandaInfo.goldCatch,
          'wood': pandaInfo.woodCatch,
          'water': pandaInfo.waterCatch,
          'fire': pandaInfo.fireCatch,
          'earth': pandaInfo.earthCatch
        }
        // console.log({attrArr: attrArr,addr: addr,product: product,geoParams: geoParams})
        return {
        	attrArr: attrArr,
        	addr: addr,
        	product: product,
        	geoParams: geoParams
        }
			},
			async function (res) {
				if (_.isError(res)) return res
				const attrArr = res.attrArr
				const addr = res.addr
				const proArr = res.product
				const geoParams = res.geoParams
				let getDiffValue = (type) => {
           for (let pro of assetsValArr) {
           	if (type === pro.productId) {
           		return pro.value
           	}
           }
        }
        let mostValRes = [] // 价值最高的商品组合
        let itemRes = [] // 返回的商品组合
        let dropRes = [] // 丢弃的商品列表
        let saveRes = [] // 保存进数据库的资产列表
        let saveProRes = [] // 保存进数据库的商品列表
        let itemsVal = 0 // 返回的商品总值
        let mostVal = 0 // 价值最高的商品总值
        let baseVal = 0 // 基本的商品组合
        let overTime = Date.parse(new Date()) / 1000 + 60 * 10 // 10s 后
        const startOut = await pandaOwnerModel.updatePandaLocationStateTrans(trans, 'out', overTime, geni)
        if (!startOut) return new Error(PandaLandCodes.Update_Panda_Attr_Fail)
        if (proArr.length >= 3) {
        	mostValRes = proArr.sort((a, b) => {
            // let aVal = getDiffValue(a.value.split('/')[1]) * parseInt(a.value.split('/')[0])
            // let bVal = getDiffValue(b.value.split('/')[1]) * parseInt(b.value.split('/')[0])
            // return bVal - aVal
            return parseInt(b.value) - parseInt(a.value)
          }).slice(0,3)
        }
        for (let item of mostValRes) {
          // mostVal += getDiffValue(item.value.split('/')[1]) * parseInt(item.value.split('/')[0])
        	mostVal += parseInt(item.value / 3)
        }
        let itemLen = mostValRes.length === 3 ? 2 : mostValRes.length -1
        if (itemLen < 0) return
        baseVal = parseInt(mostValRes[itemLen].value / 3)
        // baseVal = getDiffValue(mostValRes[itemLen].value.split('/')[1]) * parseInt(mostValRes[itemLen].value.split('/')[0])
				proArr.forEach(data => {
          let dataTypeArr = data.type.split('|')
          for (let index in dataTypeArr) {
            // if (true) {
            let starCenter = self.getDiffStarCenter(starArr, dataTypeArr[index])
            // console.log(starCenter)
            let centerPos = {
            	longitude: starCenter[0],
            	latitude: starCenter[1]
            }
            let caclPosRate = self.recognize(centerPos, geoParams)
            const valRate = parseFloat(15 / data.value) // 商品的价值系数
            const catchRate = attrArr[dataTypeArr[index]] * caclPosRate * valRate < 0 ? 0:attrArr[dataTypeArr[index]] * caclPosRate * valRate
            // console.log('catchRate', catchRate)
            if (Math.random() < 0.5) {
              itemRes.push(data)
              let curAssetsType = data.type
              if (curAssetsType === 'ETH' || curAssetsType === 'EOS') {
              	saveRes.push(data.value)
              } else {
              	saveProRes.push(data.productId)
              }
              itemsVal += parseInt(data.value / 3)
              // itemsVal += getDiffValue(data.value.split('/')[1]) * parseInt(data.value.split('/')[0])
              let finalAttrVal = attrArr[dataTypeArr[index]] + 0.1* Math.random().toFixed(4)
              // TODO updatePandaAttr是否用await
              pandaOwnerModel.updatePandaAttrTrans(trans, dataTypeArr[index] + 'Catch', finalAttrVal, geni)	
							// if (!updateAttr) return new Error(PandaLandCodes.Update_Panda_Attr_Fail)            
            } else {
            	dropRes.push(data.productId)
            }
          }
        })
        if (saveRes.length > 0) {
        	const updateLandAssets = await pandaOwnerModel.updateUserLandAssetsTrans(trans, addr, saveRes)
	        if (!updateLandAssets) return new Error(PandaLandCodes.Update_Land_Assets_Fail)
	      }
        for (let landPro of saveProRes) {
        	// 先查询需要更新的商品是否加入用户资产数据库
        	// 没有的话就insert
        	// 有的话就update
        	const specifiedPro = await pandaOwnerModel.querySpecifiedProByAddr(addr, landPro)
        	if (!specifiedPro) return new Error(LandProductCodes.Query_Product_Fail)
        	if (specifiedPro.length === 0) {
        		const insertPro = await pandaOwnerModel.insertLandProductToUser(trans, addr, landPro)
        		if (!insertPro) return new Error(LandProductCodes.Insert_Product_Fail)
        	} else {
        		const updatePro = await pandaOwnerModel.updateUserLandPro(trans, addr, landPro)
        		if (!updatePro) return new Error(LandProductCodes.Update_Product_Fail)
        	}
        }
        // 先查询该熊猫是否在backassets里还有数据
        // 若没有就插入
        // 有的话就删除这些数据再插入
        const delBackAssets = await pandaOwnerModel.deleteBackPandaAssetsByGen(trans, geni)
      	if (!delBackAssets) {
      		return new Error(PandaLandCodes.Delete_Back_Assets_Fail)
      	}
      	const insertBackAssets = await pandaOwnerModel.updateBackPandaAssetsTrans(trans, geni, saveProRes.join('|'), dropRes.join('|'))
      	if (!insertBackAssets) return new Error(PandaLandCodes.Back_Assets_Carry_Fail)
      	// 更新熊猫的积分
      	let finalIntegral = 10
      	if (itemsVal > 0 && itemsVal < baseVal) {
          finalIntegral = 10
        }
        if (itemsVal > baseVal && itemsVal < mostVal) {
          finalIntegral = 20
        }
        if (itemsVal >= mostVal) {
          finalIntegral = 30
        }
        const updateIntegral = await pandaOwnerModel.updatePandaAttrTrans(trans, 'integral', 30, geni)
        if (!updateIntegral) return new Error(PandaLandCodes.Update_Panda_Attr_Fail)
        // return new Error('PandaLandCodes.Update_Panda_Attr_Fail')
        return itemRes
			},
			function (res, callback) {
				if (_.isError(res)) {
					callback(res)
				} else {
					callback(null, res)
				}
			}
		]
		return new Promise((resolve, reject) => {
			trans.beginTransaction(function (bErr) {
				if (bErr) {
					reject(bErr)
					return
				}
				async.waterfall(tasks, function (tErr, res) {
		      if (tErr) {
		        trans.rollback(function () {
		          trans.release()
		          reject(tErr)
		        })
		      } else {
		        trans.commit(function (err, info) {
		          if (err) {
		            trans.rollback(function (err) {
		              trans.release()
		              reject(err)
		            })
		          } else {
		            trans.release()
		            resolve(res)
		          }
		        })
		      }
		    })
			})
		})
	}

	/**
		*	返回不同属性的商品中心地址 getDiffStarCenter
		*/
	getDiffStarCenter (starArr, type) {
		if (type === 'gold') {
			return starArr[0]
		}
		if (type === 'wood') {
			return starArr[1]
		}
		if (type === 'water') {
			return starArr[2]
		}
		if (type === 'fire') {
			return starArr[3]
		}
		if (type === 'earth') {
			return starArr[4]
		}
	}
	/**
		*	商品中心与熊猫外出时范围计算 recognize
		* 返回 经度与纬度的相对比例
		*/
	recognize (starPos, geoParams) {
		const caclLongi = starPos.longitude - geoParams.longitude
		const caclLati = starPos.latitude - geoParams.latitude
		const spreadWid = 180
		let longRate = 0
		let latiRate = 0
		if (caclLongi < 0 && Math.abs(caclLongi) <= 180) {
			longRate = 1 - Math.abs(caclLongi) / 180
		}
		if (caclLongi < 0 && Math.abs(caclLongi) > 180) {
			longRate = 1 - (360 + geoParams.width + caclLongi) / 180
		}
		if (caclLongi > 0 && Math.abs(caclLongi) <= 180) {
			longRate = 1 - Math.abs(caclLongi - geoParams.width < 0? 0:caclLongi - geoParams.width) / 180
		}
		if (caclLongi < 0 && Math.abs(caclLongi) > 180) {
			longRate = 1 - (360 - caclLongi) / 180
		}
		if (caclLati >= 0 && caclLati <= 90) {
			latiRate = 1 - caclLati / 90
		}
		if (caclLati >= 0 && caclLati > 90) {
			latiRate = 0
		}
		if (caclLati < 0 && Math.abs(caclLati) <= 90) {
			latiRate = 1 - Math.abs(caclLati + geoParams.height) / 90
		}
		if (caclLati < 0 && Math.abs(caclLati) > 90) {
			latiRate = 0
		}
		return latiRate * longRate
	}

  // todo 测试model层接口
  testApi (api) {
  	if (pandaOwnerModel[api]) {
  		return pandaOwnerModel[api]()
			.then(v => {
				return succRes('testApi', v)
			})
			.catch(e => {
				console.log(e)
				return serviceError()
			})
  	} else {
  		console.log('api')
  	}
  }
}

module.exports = PandaOwnerController