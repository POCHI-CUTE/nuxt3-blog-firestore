import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// // Start writing functions
// // https://firebase.google.com/docs/functions/typescript
//
exports.postContent = functions.https.onRequest(async (req, res) => {
  // 認証APIKEYの比較
  const signature = req.get("Authorization");
  const ghkey: string = process.env.GIHHUBSKEY!;

  if (signature !== ghkey) {
    functions.logger.error("api key did not match");
    res.status(403).send("Your access is not permitted");
    return;
  }
  // TODO: 新規の場合はadd、更新はsetで対応（firestoreを全検索してダブりが無いかで判定）
  // https://firebase.google.com/docs/firestore/query-data/get-data#get_multiple_documents_from_a_collection
  // TODO: github apiでcontentを取ってくる。
  // TODO: updateTimeも入れる。
  admin.initializeApp();
  admin.firestore().collection("articles").add({
    postTime: new Date(),
    tags: "test",
    text: "test text",
    title: "test title",
  });
  res.end();
});
