import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Octokit } from 'octokit'
import { Buffer } from 'node:buffer'

// // Start writing functions
// // https://firebase.google.com/docs/functions/typescript
// CI/CD導入 github actions
//
exports.postContent = functions.https.onRequest(async (req, res) => {
  // 認証APIKEYの比較
  const signature = req.get('Authorization')
  const ghkey: string = process.env.GIHHUBSKEY!

  if (signature !== ghkey) {
    functions.logger.error('api key did not match')
    res.status(403).send('Your access is not permitted')
    return
  }

  const octokit = new Octokit()

  // 初期化
  admin.initializeApp()
  const fsCollect = admin.firestore().collection('articles')
  const titleSnap = await fsCollect
    .where('title', '==', 'first test post')
    .select('title')
    .get()

  for (const key of Object.keys(req.body)) {
    const fileData = await octokit.request(
      'GET /repos/POCHI-CUTE/nuxt3-blog-contents/contents/{path}',
      {
        path: req.body[key as keyof object],
      }
    )

    const fileText = Buffer.from(
      fileData.data.content,
      fileData.data.encoding
    ).toString()
    const title = fileText.split(/\r\n|\r|\n/)[1].replace(/title: /g, '')

    // TODO: updateTimeも入れる。
    const flagObj = (() => {
      for (const doc of titleSnap.docs) {
        if (doc.data().title === title) {
          return { flag: true, docId: doc.id }
        }
      }
      return { flag: false, docId: '' }
    })()

    if (flagObj.flag) {
      fsCollect.doc(flagObj?.docId).update({
        updateTime: new Date(),
        text: fileText,
      })
    } else {
      fsCollect
        .add({
          postTime: new Date(),
          tags: '',
          text: fileText,
          title: title,
        })
        .catch((err) => {
          functions.logger.error('add data failed')
        })
    }
  }
  res.end()
})
