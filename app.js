const
  https = require('https'),
  fs = require('fs'),
  Sequelize = require('sequelize'),
  redis = require('redis'),
  api = require('ncue-api'),
  splitArray = require('split-array'),
  Bot = require('./../Messenger-Bot-Dialog'),
  RedisStore = require('./lib/connect-redis'),
  Router = Bot.Router,
  Components = Bot.Components,
  Interface = Bot.Interface,
  interface = Interface({
    verifyToken: '',
    appSecret: '',
    pageAccessToken: '',
    sessionStore: new RedisStore(redis.createClient()),
    serializeUser: function(user) {
      if (user.psid)
        return user.psid
      else
        throw new Error('This user doesn\'t has psid')
    },
    deserializeUser: async function(psid, done) {
      const user = await Users.findCreateFind(psid)
      return user
    }
  }),
  communication = interface.communication

const
  DB_CONFIG = require('./db_config.json'),
  APP_ID = '',
  router = Router(),
  cp = Components({
    strict: true
  })

const
  sequelize = new Sequelize(DB_CONFIG.db_name, DB_CONFIG.db_account, DB_CONFIG.db_password, {
    dialect: 'mysql',
    dialectOptions: {
      multipleStatements: true
    }
  }),
  Users = sequelize.define('users', {
    psid: {
      type: Sequelize.INTEGER(20),
      primaryKey: true
    },
    firstName: Sequelize.TEXT('tiny'),
    lastName: Sequelize.TEXT('tiny'),
    gender: Sequelize.TEXT('tiny'),
    timezone: Sequelize.INTEGER,
    locale: Sequelize.TEXT('tiny')
  })

sequelize.sync()

communication.setting(new cp.persistentMenu([
    new cp.persistentMenuLocale('default', [
      new cp.button.postback('登入服務', '/login'),
      new cp.button.nested('服務', [
        new cp.button.nested('🎉列出活動', [
          new cp.button.postback('🎉全部', '/event/current?type=全部'),
          new cp.button.postback('🎉通識活動', '/event/current?type=通識'),
          new cp.button.postback('🎉心靈護照', '/event/current?type=心靈'),
          new cp.button.postback('🎉語文護照', '/event/current?type=語文')
        ]),
        new cp.button.nested('🎉列出可報名活動', [
          new cp.button.postback('🎉全部', '/event/current?type=全部&available'),
          new cp.button.postback('🎉通識活動', '/event/current?type=通識&available'),
          new cp.button.postback('🎉心靈護照', '/event/current?type=心靈&available'),
          new cp.button.postback('🎉語文護照', '/event/current?type=語文&available')
        ]),
        new cp.button.nested('🎉搜尋活動', [
          new cp.button.postback('🎉搜尋活動', '/event/search?type=全部'),
          new cp.button.postback('🎉搜尋通識活動', '/event/search?type=通識'),
          new cp.button.postback('🎉搜尋心靈護照', '/event/search?type=心靈'),
          new cp.button.postback('🎉搜尋語文護照', '/event/search?type=語文'),
        ]),
        new cp.button.nested('🏝請假服務', [
          new cp.button.postback('🏝請假', '/absent/apply'),
          new cp.button.postback('🏝假單查詢', '/absent/query')
        ]),
        new cp.button.nested('其他服務', [
          new cp.button.postback('🎉列出已報名活動', '/event/signed'),
          new cp.button.postback('🎉列出已認證通識時數', '/event/approved'),
          new cp.button.postback('📝查詢成績', '/score'),
          new cp.button.postback('📖查詢課表', '/curriculum')
        ])
      ]),
      new cp.button.url('作者：阿良良 ALiangLiang', 'https://www.facebook.com/liu.w.liang.1', {
        webviewHeightRatio: 'compact'
      })
    ])
  ]))
  .catch((err) => console.error(err))

communication.setting(new cp.getStarted('/'))

communication.setting(new cp.greeting([
  new cp.greetingItem('早安 {{user_full_name}}!', 'zh_TW'),
  new cp.greetingItem('Hello {{user_first_name}}!', 'default')
]))

let display1Id
router.dialog('/', function(session, next) {
  session.jar = session.jar
  session.send(new cp.text('歡迎光臨 NCUE Plus'))
  session.send(new cp.text(`目前功能有
1. 查看所有活動
2. 查看目前可報名的活動
3. 查看活動名單
4. 直接報名
5. 取消報名
6. 列出您目前報名的活動
7. 列出您已認證的通識時數
8. 查詢歷年成績
9. 查詢課表`))
  session.send(new cp.text(`功能主要可以以選單來操作`))
  if (display1Id)
    session.send(new cp.image(display1Id))
  else
    session.send(new cp.image(void 0, {
      isReusable: true
    }), fs.createReadStream('./assets/display1.jpg'))
    .then((body) => display1Id = body.attachment_id)
  session.send(new cp.template.generic([
    new cp.templateElement.generic('登入 / 登出', {
      buttons: [
        new cp.button.accountLink('https://AUTH_SERVER.com/authorize'),
        new cp.button.accountUnlink(),
      ]
    }),
    new cp.templateElement.generic('服務', {
      buttons: [
        new cp.button.postback('講座', '/event'),
        new cp.button.postback('查詢成績', '/score'),
        new cp.button.postback('查詢課表', '/curriculum')
      ]
    }),
    new cp.templateElement.generic('請假', {
      buttons: [
        new cp.button.postback('🏝請假', '/absent/apply'),
        new cp.button.postback('🏝假單查詢', '/absent/query')
      ]
    })
  ]))
})

router.dialog('/login', function(session, next) {
  session.send(new cp.template.button('登入', [
    new cp.button.accountLink('https://AUTH_SERVER.com/authorize')
  ]))
})

router.dialog('/event', function(session, next) {
  session.send(new cp.template.generic([
    new cp.templateElement.generic('🎉列出活動', {
      buttons: [
        new cp.button.postback('🎉列出目前活動', '/event/current?type=全部'),
        new cp.button.postback('🎉列出可報名活動', '/event/current?type=全部&available')
      ]
    }),
    new cp.templateElement.generic('🎉通識護照', {
      buttons: [
        new cp.button.postback('🎉列出目前通識活動', '/event/current?type=通識'),
        new cp.button.postback('🎉列出可報名通識活動', '/event/current?type=通識&available')
      ]
    }),
    new cp.templateElement.generic('🎉心靈護照', {
      buttons: [
        new cp.button.postback('🎉列出目前心靈護照', '/event/current?type=心靈'),
        new cp.button.postback('🎉列出可報名心靈護照', '/event/current?type=心靈&available')
      ]
    }),
    new cp.templateElement.generic('🎉語文護照', {
      buttons: [
        new cp.button.postback('🎉列出目前語文護照', '/event/current?type=語文'),
        new cp.button.postback('🎉列出可報名語文護照', '/event/current?type=語文&available')
      ]
    }),
    new cp.templateElement.generic('搜尋活動', {
      buttons: [
        new cp.button.postback('🎉搜尋活動', '/event/search'),
        new cp.button.postback('🎉搜尋通識活動', '/event/search?type=通識'),
        new cp.button.postback('🎉搜尋語文護照', '/event/search?type=語文')
      ]
    })
  ]))
})

router.dialog('/event/current', function(session, next) {
  const
    type = session.params.type || '全部',
    available = session.params.available === '' || null
  api.getEvents(type)
    .then((events) => {
      if (available)
        events = events.filter((event) =>
          event.status == '報名去' && event.cur < event.max)

      if (events.length === 0)
        session.send(new cp.text('查無活動'))

      const data = splitArray(events, 3)
        .map((chunk, i) => {
          return new cp.templateElement.generic(`${type}活動 第 ${i + 1} 頁`, {
            buttons: chunk.map((event) => {
              return new cp.button.postback(event.name.slice(0, 20), '/event/service?eventId=' + event.id)
            })
          })
        })
      session.send(new cp.template.generic(data.slice(0, 10)))
    })
    .catch((err) => console.log(err))
})


router.dialog('/event/search', function(session, next) {
  session.send(new cp.text('請輸入關鍵字'))
}, function(session, next) {
  const
    keywords = session.data.message.text,
    type = session.params.type || '全部'
  api.getEvents(type)
    .then((events) => {
      events = events.filter((event) => event.name.search(keywords) !== -1)
      const data = splitArray(events, 3)
        .map((chunk, i) => {
          return new cp.templateElement.generic(`${type}活動 第 ${i + 1} 頁`, {
            buttons: chunk.map((event) => {
              return new cp.button.postback(event.name.slice(0, 20), '/event/service?eventId=' + event.id)
            })
          })
        })

      if (data.length !== 0)
        session.send(new cp.template.generic(data.slice(0, 10)))
      else
        session.send(new cp.text(`找不到關鍵字為「${keywords}」的活動`))
    })
    .catch((err) => console.log(err))
})

router.dialog('/event/service', function(session, next) {
  const eventId = session.params.eventId
  api.getEvent(eventId)
    .then((event) => {
      const title = `●活動名稱：${event.name}
●活動地點：${event.place}
●活動日期：${event.date.toLocaleDateString('zh-tw')}
●人數上限：${event.max}
●活動狀態：${event.status}
●活動內容：
${event.description}`.match(/(.|\n){1,640}/g)
      console.log(title)
      title.forEach((e, i, a) => {
        if (i === a.length - 1)
          session.send(new cp.template.button(e, [
            new cp.button.url('開啟活動頁面', 'http://aps.ncue.edu.tw/app/show_crs.php?crs_seq=' + eventId),
            new cp.button.postback('直接報名', '/event/signup?eventId=' + eventId),
            new cp.button.postback('查看報名名單', '/event/members?eventId=' + eventId),
          ]))
        else
          session.send(new cp.text(e))
      })
    })
})

router.dialog('/event/signup', loginStep, function(session, next) {
  const eventId = session.params.eventId
  api.signupEvent(session.jar, eventId, session.jar.userId)
    .then((result) => {
      if (result)
        session.send(new cp.text('報名成功'))
      else
        session.send(new cp.text('報名失敗'))
    }, (err) => session.send(new cp.text('報名失敗，' + err)))
})

router.dialog('/event/cancelSignup', loginStep, function(session, next) {
  session.send(new cp.quickReply('確定取消報名?', [
    new cp.quickReplyItem('text', {
      title: '確定',
      payload: '/event/cancelSignup?sure&eventId=' + session.params.eventId
    }),
    new cp.quickReplyItem('text', {
      title: '不要',
      payload: '/'
    })
  ]))
}, function(session, next) {
  if (session.data.message.text === '不要')
    return

  const jar = session.jar,
    eventId = session.params.eventId
  api.getSignSeq(jar, eventId)
    .then((seq) => api.cancelSignupEvent(jar, seq))
    .then((result) => {
      if (result)
        session.send(new cp.text('取消報名成功'))
      else
        session.send(new cp.text('取消報名失敗'))
    }, (err) => session.send(new cp.text('取消報名失敗，' + err)))
})

router.dialog('/event/members', function(session, next) {
  const eventId = session.params.eventId
  api.getEventMember(eventId)
    .then((members) => {
      const stringArray = members.map((member) => `${member.name}｜${(member.gender === 1) ? '男' : '女'}｜${member.from}｜${member.job}`)
      let
        textChunk = [''],
        temp = 0

      stringArray.forEach((string) => {
        if (textChunk[temp].length + string.length > 640) {
          temp += 1
          textChunk[temp] = string
        } else
          textChunk[temp] += '\n' + string
      })

      textChunk.forEach((text) => session.send(new cp.text(text)))
    })
})

router.dialog('/event/signed', loginStep, function(session, next) {
  api.getSignedupEvents(session.jar)
    .then((events) => {
      if (events.length === 0)
        return session.send(new cp.text('目前尚未報名任何活動哦。'))

      const data = events.map((event, i) => {
        const subtitle = `●活動日期：${event.date.toLocaleDateString('zh-tw')}
●人數上限：${event.max}
●目前人數：${event.cur}`
        return new cp.templateElement.generic(event.name, {
          subtitle: subtitle,
          buttons: [
            new cp.button.url('打開活動頁面', 'http://aps.ncue.edu.tw/app/' + event.href),
            new cp.button.postback('報名名單', '/event/members?eventId=' + event.id),
            new cp.button.postback('取消報名', '/event/cancelSignup?eventId=' + event.id)
          ]
        })
      })

      session.send(new cp.template.generic(data.slice(0, 10)))
    }, (err) => {
      if (err === '尚未登入。')
        session.beginDialog('/login')
    })
})

router.dialog('/event/approved', loginStep, function(session, next) {
  api.getApprovedGeneralEduList(session.jar)
    .then((events) => {
      console.log(events)
      const
        hourSum = events.reduce((acc, val) => acc + val.hours, 0),
        content = events.map((event) =>
          `${event.date.toLocaleDateString('zh-tw')}｜${event.hours}小時｜${event.name}`)
        .join('\n'),
        data = `●目前通識時數累計 ${hourSum} 小時
●尚須 ${24 - hourSum} 小時，約莫 ${(24 - hourSum) / 2} 場
●已認證通時數：
${content}`

      if (data.length !== 0)
        session.send(new cp.text(data))
      else
        session.send(new cp.text('目前尚未參與過任何通識活動哦。'))
    }, (err) => {
      if (err === '尚未登入。')
        session.beginDialog('/login')
    })
})

router.dialog('/score', loginStep, function(session, next) {
  api.getResult(session.jar)
    .then((results) => {
      const groups = {}

      // 按照學期分組
      results.forEach((result) => {
        const key = `📝${result.year} 學年度｜第 ${result.semester} 學期`
        if (!groups[key])
          groups[key] = [result]
        else
          groups[key].push(result)
      })

      // 依學期順序傳送成績資訊
      for (let key in groups) {
        const article = key + '\n' + groups[key]
          .map((result) => `${result.score}分｜${result.credit}學分｜${result.name}`).join('\n')
        session.send(new cp.text(article))
      }
    })
    .catch((err) => console.log(err))
})

router.dialog('/curriculum', loginStep, function(session, next) {
  api.getCurriculum(session.jar)
    .then((courses) => {
      const article = '📖課表：\n' + courses.map((course) => {
        const periodsString = (course.periods.length) ?
          course.periods[0] + '-' + course.periods[course.periods.length - 1] :
          '無上課時間'

        return `${course.name}｜${periodsString}節｜${(course.place!=='')?course.place:'無上課地點'}｜${course.credit}學分`
      }).join('\n')

      session.send(new cp.text(article))
    })
    .catch((err) => console.log(err))
})

router.dialog('/absent/apply', loginStep, function(session, next) {
  session.prompt(new cp.text('請輸入請假起日, ex: 2017/5/3'))
}, function(session, result, next) {
  console.log(result)
  session.prompt(new cp.text('請輸入請假止日, ex: 2017/5/3'))
}, function(session, result, next) {
  console.log(result)
  session.prompt(new cp.template.button('請選擇假别', [
    new cp.button.postback('公假', '1'),
    new cp.button.postback('事假', '2'),
    new cp.button.postback('病假', '3')
  ]))
}, function(session, result, next) {
  console.log(result)
  session.prompt(new cp.text('請輸入聯絡電話, ex: 0987654321'))
}, function(session, result, next) {
  session.prompt(new cp.text('請輸入事由, ex: 今天那個來'))
}, function(session, result, next) {
  session.prompt(new cp.text('請輸入請假星期及節次，範例：禮拜三 一到4節 禮拜四 7-八節'))
}, function(session, result, next) {
  session.prompt(new cp.template.button('是否有證明文件', [
    new cp.button.postback('有證明文件', '1'),
    new cp.button.postback('無證明文件', '2'),
    new cp.button.postback('證明文件逕行繳交導師查驗', '3')
  ]))
}, function(session, result, next) {
  if (JSON.parse(session.data.postback).doc === '1')
    session.prompt(new cp.text('請上傳證明文件'))
  else
    next()
}, function(session, next) {
  api.absentApply(session.jar)
    .then((courses) => {
      const article = '📖課表：\n' + courses.map((course) => {
        const periodsString = (course.periods.length) ?
          course.periods[0] + '-' + course.periods[course.periods.length - 1] :
          '無上課時間'

        return `${course.name}｜${periodsString}節｜${(course.place!=='')?course.place:'無上課地點'}｜${course.credit}學分`
      }).join('\n')

      session.send(new cp.text(article))
    })
    .catch((err) => console.log(err))
})

function loginStep(session, next) {
  if (!session.jar)
    session.send(new cp.template.button('請先登入', [
      new cp.button.accountLink('https://AUTH_SERVER.com/authorize')
    ]))
  else
    next()
}

function finalHandle(err) {
  if (err) {
    console.error('Error:')
    console.error(err)
  }
}

const interfaceOptions = {
  loginPage: fs.readFileSync('./assets/login.html', 'utf8'),
  accountName: 'userId',
  passwordName: 'password',
  loginChecker: async function(userId, password) {
    try {
      const
        jar = api.jar(),
        result = await api.login(jar, userId, password, {
          remember: true,
          autoRelogin: true
        })
      return {
        result: result,
        data: jar
      }
    } catch (e) {
      console.error(e)
      return false
    }
  },
  onLogin: function(session, jar) {
    session.jar = jar
  },
  onLogout: function(session, jar) {
    api.logout(jar)
  }
}

const
  server = https.createServer({
    key: fs.readFileSync('/PATH/OF/privkey.pem'),
    cert: fs.readFileSync('/PATH/OF/cert.pem'),
    ca: fs.readFileSync('/PATH/OF/chain.pem'),
  }, function(req, res) {
    try {
      if (req.url === '/favicon.png') {
        const filePath = './assets/NCUE.png'
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': fs.statSync(filePath).size
        })
        fs.createReadStream(filePath).pipe(res)
      } else
        interface(req, res, router, finalHandle, interfaceOptions)
    } catch (err) {
      console.error(err)
    }
  });

server.listen(PORT)
