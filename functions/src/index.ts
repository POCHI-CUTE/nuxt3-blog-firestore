import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { Octokit } from 'octokit'
import { Buffer } from 'node:buffer'
import dayjs from 'dayjs'

admin.initializeApp()
const octokit = new Octokit()

interface BlogRequest extends functions.Request {
  body: {
    [key: string]: string
  }
}

// Realtime Databaseに書き込みを行う関数
export const createArticle = functions.https.onRequest(
  async (req: BlogRequest, res: functions.Response) => {
    try {
      // 認証APIKEYの比較
      const signature = req.get('Authorization')
      const ghkey: string = process.env.GIHHUBSKEY!

      if (signature !== ghkey) {
        functions.logger.error('api key did not match')
        res.status(403).send('Your access is not permitted')
      }

      for (const key of Object.keys(req.body)) {
        const filename = req.body[key]
        // .yamlを編集したときは飛ばす
        if (isYaml(filename)) continue

        const fileData = await octokit.request(
          'GET /repos/POCHI-CUTE/nuxt3-blog-contents/contents/{path}',
          {
            path: filename,
          }
        )
        const fileText = Buffer.from(
          fileData.data.content,
          fileData.data.encoding
        ).toString()
        // DBに入れるkey
        const titleId = filename.replace(/\.[^/.]+$/, '')
        const title = fileText.split(/\r\n|\r|\n/)[1].replace(/title: /g, '')
        const content = fileText.split('\n').slice(4).join('\n')

        const articleSnapshot = await admin
          .database()
          .ref('articles')
          .orderByChild('titleId')
          .equalTo(titleId)
          .once('value')
        if (articleSnapshot.exists()) {
          // 既存の記事を更新する
          const updatedDate = dayjs().format('YYYY-MM-DD')
          const articleRef = admin
            .database()
            .ref('articles')
            .child(Object.keys(articleSnapshot.val())[0])
          await articleRef.update({
            titleId,
            title,
            content,
            updatedDate,
          })
        } else {
          // 新しい記事を追加する
          const createdDate = dayjs().format('YYYY-MM-DD')
          const articleRef = admin.database().ref('articles').push()
          await articleRef.set({ titleId, title, content, createdDate })
        }
      }

      res.send({ success: true })
    } catch (err: any) {
      console.error(err.message)
      res.sendStatus(500)
    }
  }
)
function isYaml(filename: string): boolean {
  return /\.(yaml|yml)$/i.test(filename)
}
