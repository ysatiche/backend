const Db = require('./Db.js')
const db = new Db()

const { UserServerModel } = require('../sqlModel/user.js')
const { LandAssetsServerModel } = require('../sqlModel/landAssets.js')

const { PandaOwnerServerModel } = require('../sqlModel/pandaOwner.js')
const { pandaOwnerTestData } = require('../mysqlData/pandaOwner/sqlData.js')

const { LandProductServerModel } = require('../sqlModel/landProduct.js')
const { landProductTestData } = require('../mysqlData/landProduct/sqlData.js')

/**
	@TestModel 测试数据专用
		- user
	    - 判断user表是否存在 checkUserTableExist
	    - 新建user表 createTableUser
	    - 删除user表 dropTableUser
		- landassets
	    - 判断landassets表是否存在 checkLandassetsTableExist
	    - 新建landassets表 createTableLandassets
	    - 删除landassets表 dropTableLandassets
		- landproduct
	    - 新建LandProduct数据表 createLandProductTable()
	    - 删除LandProduct数据表 dropLandProductTable()
	    - 判断LandProduct表是否存在 checkLandProductTableExist
	    - 插入测试数据 insertDataToLandProduct()
	  - pandaowner
	  	- 新建pandaOwner数据表 createPandaOwnerTable()
	    - 删除pandaOwner数据表 dropPandaOwnerTable()
	    - 插入测试数据 insertDataToPandaOwner()
	    - 判断pandaowner数据表是否存在  checkPandaownerTableExist

*/

class TestModel {

	async startTransaction () {
		return db.startTransaction()
	}

	/* user && landassets  */
	async checkUserTableExist () {
    let sql = 'show tables like "%user%"'
    return db.query(sql)
  }

  async checkLandassetsTableExist () {
    let sql = 'show tables like "%landassets%"'
    return db.query(sql)
  }

  async dropTableLandassets () {
    let sql = 'DROP TABLE landassets'
    return db.query(sql)
  }

  async dropTableUser () {
    let sql = 'DROP TABLE user'
    return db.query(sql)
  }

  async createTableUser () {
    let sql = 'CREATE TABLE user('
    for(let index in UserServerModel) {
       if (UserServerModel.hasOwnProperty(index)) {
          let obj = UserServerModel[index]
          if (obj) {
            if (obj.label === 'other') {
              sql += obj.type
            } else {
              sql = sql + obj.label + ' ' + obj.type + ','
            }
          }
       }
    }
    return db.query(sql)
  }

  async createTableLandassets () {
    let sql = 'CREATE TABLE landassets('
    for(let index in LandAssetsServerModel) {
       if (LandAssetsServerModel.hasOwnProperty(index)) {
          let obj = LandAssetsServerModel[index]
          if (obj) {
            if (obj.label === 'other') {
              sql += obj.type
            } else {
              sql = sql + obj.label + ' ' + obj.type + ','
            }
          }
       }
    }
    return db.query(sql)
  }

  /* landproduct  */
  async createLandProductTable () {
    let sql = 'CREATE TABLE landProduct('
    for(let index in LandProductServerModel) {
       if (LandProductServerModel.hasOwnProperty(index)) {
          let obj = LandProductServerModel[index]
          if (obj) {
            if (obj.label === 'other') {
              sql += obj.type
            } else {
              sql = sql + obj.label + ' ' + obj.type + ','
            }
          }
       }
    }
    return db.query(sql)
  }

  async dropLandProductTable() {
    let sql = 'DROP TABLE landProduct'
    return db.query(sql)
  }

  async insertDataToLandProduct () {
    let sql = 'INSERT INTO pandaOwner VALUES '
    for (let i = 0; i < landProductTestData.length; i++) {
      if (i !== landProductTestData.length - 1) {
        sql += landProductTestData[i] + ','
      } else {
        sql += landProductTestData[i]
      }
    }
    return db.query(sql)
  }

  async checkLandProductTableExist () {
    let sql = 'show tables like "%landproduct%"'
    return db.query(sql)
  }

  /* pandaowner */
  async dropPandaOwnerTable () {
    let sql = 'DROP TABLE pandaOwner'
    return db.query(sql)
  }

  async checkPandaownerTableExist () {
    let sql = 'show tables like "%pandaOwner%"'
    return db.query(sql)
  }

  async createPandaOwnerTable () {
    let sql = 'CREATE TABLE pandaOwner('
    for(let index in PandaOwnerServerModel) {
       if (PandaOwnerServerModel.hasOwnProperty(index)) {
          let obj = PandaOwnerServerModel[index]
          if (obj) {
            if (obj.label === 'other') {
              sql += obj.type
            } else {
              sql = sql + obj.label + ' ' + obj.type + ','
            }
          }
       }
    }
    return db.query(sql)
  }

  async insertDataToPandaOwner () {
    let sql = 'INSERT INTO pandaOwner VALUES '
    for (let i = 0; i < pandaOwnerTestData.length; i++) {
      if (i !== pandaOwnerTestData.length - 1) {
        sql += pandaOwnerTestData[i] + ','
      } else {
        sql += pandaOwnerTestData[i]
      }
    }
    return db.query(sql)
  }
}

module.exports = TestModel