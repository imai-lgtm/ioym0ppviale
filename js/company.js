/* =========================================================
   会社ごとの設定（★ここを書きかえると中身が変わる）
   日本介護医療センター 採用オリジナルゲーム「おいでよ、介護の1日。」
   出典の目安： [HP] = 会社ホームページ / [採用] = 採用サイト nihon-kaigo.net / [高卒] = 高卒採用サイト
                [声] = 採用サイトの「先輩の声」 / [ブログ] = 施設ブログ
   写真・イラストはイメージ（生成画像）。人物名・入居者・会話のつなぎは演出
   ========================================================= */
window.COMPANY = {
  id: 'nihonkaigo',
  issue: '採用体験ゲーム',
  gameTitle: 'おいでよ、介護の1日。',            // 代表メッセージ「おいでよ、介護職の世界へ」[高卒]より
  name: '株式会社日本介護医療センター',
  shortName: '日本介護医療センター',
  industry: '介護・高齢者向け住宅',               // [HP]
  area: '大阪市阿倍野区',                          // [HP]
  staff: '従業員 約380人',                         // [高卒]
  catchLines: ['おいでよ、', '介護の1日。'],      // ゲーム名（代表メッセージより）
  quote: '人の人生に、\nそっと寄り添うプロになる。', // [高卒]採用サイトのコピー
  catchSub: '資格がなくても大丈夫。介護スタッフの、はじめての1日。',
  startLabel: '介護の1日をはじめる',
  hp: 'https://www.nihon-kaigo.net/',
  hpLabel: '採用サイトを見る',
  links: [
    { label: '高卒採用サイトを見る', url: 'https://olive973581.studio.site/', icon: 'building' },
    { label: '会社のホームページを見る', url: 'http://www.nihon-kaigo.com/', icon: 'building' },
    { label: 'Instagram を見る', url: 'https://www.instagram.com/nihonkaigo/', icon: 'ext' },
  ],
  tel: '0120-85-3131',
  logo: 'img/logo_nk.webp',      // 会社ロゴ（ヘッダー）
  mark: 'img/mark_cherry.webp',  // さくらんぼのマーク（小さいアイコン）
  // 差し色は会社ロゴのさくらんぼ色から。タイトルの写真はイメージ
  theme: { accent: '#C8304E', accentInk: '#A3243F', titlePhoto: 'img/p_hero.webp', titlePos: '50% 22%' },

  // 先輩（名前は演出。話の中身は[声]の先輩の声をもとにしている）
  people: {
    a: { name: 'ミオさん', sub: '介護スタッフ・入社4年目（高卒で入社）', img: 'img/avatar_a_smile.webp', img2: 'img/avatar_a_laugh.webp', color: '#F8CDD3',
         profile: ['高校で介護の資格をとって入社', 'いまは新人さんに同行して教える係も', '好きなこと：カラオケ・カフェめぐり'] },
    b: { name: 'ケンタさん', sub: 'ホームのリーダー・入社10年目', img: 'img/avatar_b_smile.webp', img2: 'img/avatar_b_laugh.webp', color: '#CDEBDD',
         profile: ['未経験で入社し、働きながら介護福祉士に', 'いまはホームのリーダー', '好きなこと：料理・サウナ'] },
  },
  groupName: 'さくらんぼチーム',
  guide: { name: 'チェルパ～ちゃん', img: 'img/chelper.webp', joy: 'img/chelper_joy.webp', cheer: 'img/chelper_cheer.webp', point: 'img/chelper_point.webp' }, // [HP] 会社のゆるキャラ

  /* 魅力シール（集めるとシール帳に並ぶ） */
  charms: {
    follow:  { title: 'ひとりにさせない', body: '最初は先輩がとなりについて、いっしょに動きながら教えてくれます。「何があっても周りがフォローします！」（先輩の声）', sticker: 'img/st_heart.webp', src: '採用' },
    shikaku: { title: '資格の学費は会社が全額負担', body: '介護の仕事に必要な「初任者研修」の学費（3万〜10万円ほど）を会社が全額負担。資格がなくても入社できます。', sticker: 'img/st_scroll.webp', src: '採用・高卒' },
    cherry:  { title: 'さくらんぼに込めた想い', body: 'グループのマークはさくらんぼ。人が集まり、支え合って「実を結ぶ」という願いが込められています。', sticker: 'img/st_cherry.webp', src: '高卒' },
    doki:    { title: '同期といっしょに新人研修', body: '入社後はグループ全体で研修。ビジネスマナーや介護の基本、普通救命講習も受けます。同期の仲間ができます。', sticker: 'img/st_star.webp', src: '採用' },
    usj:     { title: 'USJで「おもてなし」研修', body: '現場に慣れてきた秋ごろ、同期とUSJで再会。おもてなしを学ぶフォローアップ研修。年間パスポートのプレゼントも！', sticker: 'img/st_ferris.webp', src: '高卒・採用' },
    shift:   { title: 'シフト制・残業ほぼなし', body: 'シフト制で週休2日。残業はほとんどなく、プライベートの時間も大切にできます。', sticker: 'img/st_clover.webp', src: '高卒・採用' },
    near:    { title: '通いやすいホームを選べる', body: '大阪市内から府内、奈良県まで20以上のホーム。希望の勤務地で働けます。', sticker: 'img/st_house.webp', src: 'HP・高卒' },
    onsen:   { title: '天然温泉のホームも', body: '「鳥飼 輝きの郷」には弱アルカリ性の天然温泉の大浴場。入居者さんのいやしの時間です。', sticker: 'img/st_onsen.webp', src: 'HP' },
    local:   { title: '地域とつながるホーム', body: 'だんじりや獅子舞がホームに来てくれることも。「子ども110番の家」として地域の安心にも協力しています。', sticker: 'img/st_lantern.webp', src: 'HP・ブログ' },
    health:  { title: '健康経営優良法人 6年連続', body: '働きやすい環境づくりが評価され、6年連続で認定。女性の育休取得率100%、本社近くには保育所も。', sticker: 'img/st_baby.webp', src: '高卒・採用' },
  },

  /* 前の日：チームのグループトーク（演出） */
  prologue: {
    time: '前の日 19:00',
    msgs: [
      { who: 'a', text: '明日からよろしくね！同じフロアのミオです😊' },
      { who: 'b', text: 'リーダーのケンタです。最初はずっと先輩がとなりについて教えるから、安心してね', charm: 'follow' },
      { who: 'a', img: 'img/chelper_joy.webp', stamp: true },
      { who: 'a', text: '↑うちのゆるキャラ「チェルパ～ちゃん」のスタンプ！若手社員のアイデアから生まれたキャラなんだよ' },
      { who: 'b', text: '明日は9:00集合。朝は、夜勤さんからの「申し送り」から始まるよ' },
    ],
    choices: [
      { label: 'よろしくお願いします！', reply: [{ who: 'a', text: 'こちらこそ！明日いっしょにがんばろうね', face: 2 }] },
      { label: 'ちょっと緊張してます…', reply: [{ who: 'b', text: '大丈夫。ひとりぼっちにはさせないよ。うちの社長もいつも言ってることなんだ', face: 2 }] },
    ],
    next: '翌朝 9:00 へ',
  },

  /* 午前：写真クリップ */
  clips: [
    { img: 'img/p_handover.webp', stamp: '09:00', title: '朝の申し送りからスタート', text: '夜勤のスタッフから、夜のあいだの入居者さんの様子を引きつぎます。体調の変化や気になったことを、チームで共有します。',
      quiz: { q: '介護の仕事に必要な資格「初任者研修」。日本介護医療センターでは、学費はだれが払う？',
              opts: ['会社が全額負担してくれる', '半分を自分で払う', '全額を自分で払う'], ok: 0,
              exp: '初任者研修の学費（3万〜10万円ほど）は会社が全額負担。資格がなくても入社して、働きながら取れます。', charm: 'shikaku' }, next: 'つぎへ' },
    { img: 'img/p_record.webp', stamp: '09:30', title: 'その人に合った手伝いを', text: 'ケアマネジャーが立てた計画（ケアプラン）にそって、一人ひとりに合った手伝いをします。記録はタブレットで。',
      quiz: { q: 'グループのマークは「さくらんぼ」。こめられた意味は？',
              opts: ['人が集まり、支え合って実を結ぶ', 'おいしい果物を毎日食べよう', '赤は元気が出る色だから'], ok: 0,
              exp: '「人が実を結ぶ」「人に実が生る」。人が集まり、お互いを支え合って大切にする、という願いが込められています。', charm: 'cherry' }, next: 'ホームをまわってみる' },
  ],
  walkTime: '10:00',
  walk: { // ホームさんぽ（♡でシールゲット）
    title: 'ホームさんぽ',
    sub: '気になったら ♡ をタップ',
    next: '見守りラウンドへ',
    items: [
      { img: 'img/p_onsen.webp', title: '天然温泉の大浴場があるホームも', text: '「鳥飼 輝きの郷」の天然温泉。入居者さんのいやしの時間です。', charm: 'onsen', axis: 'yorisoi' },
      { img: 'img/p_garden.webp', title: '屋上庭園でひとやすみ', text: '「鳥飼 輝きの郷」には屋上庭園も。季節の花をながめながら、ゆっくりお話しします。', axis: 'yorisoi' },
      { img: 'img/p_kitchen.webp', title: 'ごはんは館内でできたて', text: '厨房のあるホームでは、毎食できたての温かいごはんを用意しています。', axis: 'yorisoi' },
      { img: 'img/p_shishimai.webp', title: '地域のお祭りがやってくる', text: 'だんじりや獅子舞が、ホームの前まで来てくれることも。', charm: 'local', axis: 'team' },
      { img: 'img/p_karaoke.webp', title: 'カラオケ大会で大もりあがり', text: '季節のイベントもスタッフが企画。ふだん静かな方が、大きな声で歌うことも。', axis: 'yorisoi' },
    ],
  },

  /* 見守りラウンド（mimamori.js）
     「目配り気配りして、体調不良など早期発見に努めています」[声] をもとにしたゲーム。ちがいの中身は演出 */
  work: {
    title: '見守りラウンド',
    time: '10:30',
    memo: '入居者さんの小さな変化に、どうやって気づいている？',
    roomSeconds: 16,
    residents: [
      { name: 'ハナさん', room: '201号室', good: 'img/res1_good.webp', tiredImg: 'img/res1_tired.webp',
        yesterday: { tray: 'empty', cup: 'empty', flower: 'fresh', tissue: false, pill: false },
        today:     { tray: 'half',  cup: 'empty', flower: 'fresh', tissue: true,  pill: false },
        diffs: ['face', 'tray', 'tissue'],
        ask: 'ハナさん、きょうは元気がなく、朝ごはんを半分残している。どうする？',
        opts: ['先輩に報告して、記録にも残す', '自分ひとりで様子を見ておく', 'たまたまだと思って、何もしない'], ok: 0,
        exp: '小さな変化は、チームで共有することが大切。看護師さんやケアマネジャーにもつながります。' },
      { name: 'タジマさん', room: '203号室', good: 'img/res2_good.webp', tiredImg: 'img/res2_tired.webp',
        yesterday: { tray: 'empty', cup: 'empty', flower: 'none', tissue: false, pill: false },
        today:     { tray: 'empty', cup: 'full',  flower: 'none', tissue: false, pill: true },
        diffs: ['face', 'cup', 'pill'],
        ask: 'タジマさん、お茶を飲んでいなくて、お薬も残っている。どうする？',
        opts: ['声をかけてお茶をすすめ、お薬のことは先輩と看護師さんに伝える', '自分の判断でお薬を飲ませる', 'あとで飲むだろうから放っておく'], ok: 0,
        exp: '水分をとってもらう声かけも大事な仕事。お薬のことは、自分だけで判断せずに必ずチームで。' },
      { name: 'キヨさん', room: '205号室', good: 'img/res3_good.webp', tiredImg: 'img/res3_tired.webp',
        yesterday: { tray: 'empty', cup: 'empty', flower: 'fresh', tissue: false, pill: false },
        today:     { tray: 'half',  cup: 'empty', flower: 'wilt',  tissue: false, pill: false },
        diffs: ['face', 'flower', 'tray'],
        ask: 'キヨさん、顔色が悪く、ごはんも残している。大好きなお花の水やりもしていない。どうする？',
        opts: ['すぐに看護師さんと先輩に知らせる', '自分で熱を下げる方法を考える', '寝ていれば治ると思って、そのまま'], ok: 0,
        exp: '体調の変化は、早く気づいて早く知らせることが大切。24時間の見守り体制と、協力医療機関がささえています。' },
    ],
  },

  /* お昼：先輩トーク（3つ選ぶ）[声][採用][高卒]をもとに */
  lunch: {
    time: '12:00',
    open: [
      { who: 'a', text: 'お昼〜！食堂のごはん、いっしょに食べよ🍙' },
      { who: 'a', img: 'img/p_meal.webp' },
      { who: 'b', text: '食べながら、聞きたいことあったら何でも聞いてね' },
    ],
    pick: 3,
    questions: [
      { label: 'なんで介護の仕事に？', axis: 'yorisoi', ans: [
        { who: 'a', text: 'おばあちゃんが認知症になって、私に何かできることないかなって考えてたんだ' },
        { who: 'a', text: '高校でヘルパーの資格がとれるって聞いてとったの。学校の紹介でホームを見学して、笑顔で介護してるヘルパーさんを見て「やってみたい」って思った', face: 2 } ] },
      { label: '1年目はどうだった？', axis: 'grow', ans: [
        { who: 'a', text: '初めてのことばかり。排泄の介助は、資格の勉強と実際とで全然ちがって、慣れるまで大変だったよ' },
        { who: 'a', text: 'でも先輩が同行してくれて。1年たったら、今度は私が新人さんに教える側になったんだ', face: 2 } ] },
      { label: 'うれしかったことは？', axis: 'yorisoi', ans: [
        { who: 'a', text: '体調をくずして食欲がなかった方が、少しずつ元気になって' },
        { who: 'a', text: '「美味しいわ」って完食してくれたとき。ほんとにうれしかった', face: 2 } ] },
      { label: '資格はどうやってとるの？', axis: 'grow', ans: [
        { who: 'b', text: '初任者研修の学費は会社が全額負担。資格がなくても入社できるよ', charm: 'shikaku' },
        { who: 'b', text: '次の実務者研修にも支援があるし、働きながら介護福祉士やケアマネジャーを目指す人もいるよ' } ] },
      { label: '休みや残業は？', axis: 'grow', ans: [
        { who: 'b', text: 'シフト制で週休2日。残業はほとんどないよ', charm: 'shift' },
        { who: 'b', text: 'シフトは早出・日勤・中出・遅出・夜勤があって、慣れてきたら夜勤にも入るよ。夜勤手当もつくんだ' } ] },
      { label: '研修ってどんなの？', axis: 'grow', ans: [
        { who: 'b', text: '入社したらグループ全体で研修。同期の仲間ができるよ', charm: 'doki' },
        { who: 'b', img: 'img/p_training.webp' },
        { who: 'b', text: '救命講習や、オムツの研修、介護食の試食もあるよ' },
        { who: 'a', text: '秋にはUSJで「おもてなし」を学ぶ研修も！年間パスポートまでもらえたんだ', charm: 'usj', face: 2 } ] },
      { label: 'どんな人が向いてる？', axis: 'kizuki', ans: [
        { who: 'a', text: '人と話すのが好きな人。あと、人の変化に気づける人かな' },
        { who: 'b', text: '人と接するのが好きなら大丈夫。最初からできる人なんていないよ', face: 2 } ] },
    ],
    close: [
      { who: 'b', text: '午後は、ちょっと相談したいことがあるんだ。チームで作戦会議しよう' },
    ],
    next: '14:00 作戦会議へ',
  },

  /* 午後：「その人らしさ」作戦会議（演出）
     採用サイト掲載の職員のマンガ（大阪市の介護エピソードで優秀賞）がもとの話 */
  dignity: {
    time: '14:00',
    day: '14:00 チームの作戦会議',
    open: [
      { who: 'b', text: '203号室のタジマさん。若いころに会社をつくって、ずっと社長をしてきた方なんだ' },
      { who: 'b', img: 'img/res2_grumpy.webp', res: true },
      { who: 'a', text: '最近、お手伝いしようとすると「ワシにかまうな！」って言われちゃうんだよね…' },
      { who: 'b', text: 'どうしたら、タジマさんが気持ちよく過ごせると思う？' },
    ],
    choices: [
      { label: '「お手伝いしますね」と、ていねいに何度も声をかける', ok: false,
        reply: [{ who: 'a', text: 'ていねいなのは大事！でも「手伝われる」こと自体が、タジマさんにはつらいのかも…' }] },
      { label: '会社の話を聞いて、「会長」として相談させてもらう', ok: true,
        reply: [{ who: 'b', text: 'いいね！タジマさんが大切にしてきた「社長としての誇り」を大事にする作戦だね', face: 2 }] },
      { label: 'しばらく、そっとしておく', ok: false,
        reply: [{ who: 'b', text: 'ムリをしないのも大切。でも、ひとりぼっちにはしたくないよね' }] },
    ],
    plan: [
      { who: 'b', text: 'チームで話し合って、ぼくたちは「タジマさんの会社に、新しく入った社員」としてあいさつすることにしたんだ' },
      { who: 'a', text: '「会長、コーヒーお持ちしました！」って言ったら…' },
      { who: 'a', img: 'img/res2_good.webp', res: true },
      { who: 'a', text: '「おう、新人か！」って笑ってくれた！昔の写真まで見せてくれたんだよ', face: 2 },
      { who: 'b', text: 'その人の人生や「らしさ」を大事にすると、関わり方が変わる。これも介護の仕事なんだ' },
      { who: 'b', text: '実はこれ、うちの職員が描いた介護のマンガがもとの話。大阪市のコンテストで優秀賞をとったんだよ', face: 2 },
    ],
    next: '正直トークを聞く',
  },

  /* 正直トーク（大変なところ。公開情報にあることだけ） */
  real: {
    title: 'ここ、ちょっと大変かも。',
    sub: '採用サイトの先輩の声や、会社の公開情報から',
    cards: [
      { img: 'img/p_walk.webp', stamp: '15:30', head: '体を使う場面もある',
        sub: '車いすへの移りかわりや、お風呂の手伝いなど。体の負担を軽くする「マッスルスーツ」の導入にも取り組んでいる', who: 'b', say: 'ひとりで無理をしないのが基本。チームで声をかけ合うよ', memo: '体の負担を軽くするために、どんな工夫をしている？', axis: 'team' },
      { img: 'img/p_garden.webp', head: '最初は、会話がむずかしいことも',
        sub: '表情や体調を読みとりながら話すのは、慣れるまでむずかしい。長く関わるうちに笑顔が増えていく', who: 'a', say: '私も最初は話すのが苦手だったよ。いまは毎日楽しい！', memo: '入居者さんとうちとけるコツは？', axis: 'yorisoi' },
      { img: 'img/p_building.webp', head: 'シフト制で、夜勤もある',
        sub: '早出・日勤・中出・遅出・夜勤のシフト。夜は巡回して、入居者さんが安心して眠れるように見守る', who: 'b', say: '夜勤には手当もつくし、休みはシフトで相談できるよ', memo: '夜勤は月に何回くらい？夜はどんな仕事をする？', axis: 'grow' },
    ],
  },

  /* 夕方：帰り道 */
  evening: {
    time: '18:00',
    day: '18:00 帰り道',
    open: [
      { who: 'b', text: '今日はおつかれさま！初日どうだった？', face: 2 },
      { who: 'a', text: 'タジマさん、帰りぎわに「また明日な、新人」って言ってたよ😂' },
      { who: 'a', img: 'img/p_newhire.webp' },
      { who: 'a', text: 'これは入社式の日の写真。毎年、高校を卒業した人も入社してるんだ' },
      { who: 'b', text: 'うちは大阪市内から奈良まで20以上のホームがあるから、通いやすい場所を選べるよ', charm: 'near' },
      { who: 'b', text: '働きやすさの取り組みで、6年連続「健康経営優良法人」にも選ばれてるんだ', charm: 'health' },
    ],
    ask: '今日の1日で、いちばん心に残ったのは？',
    choices: [
      { label: '入居者さんの小さな変化に気づけたこと', axis: 'kizuki' },
      { label: 'タジマさんが笑ってくれたこと', axis: 'yorisoi' },
      { label: 'ひとりじゃない、チームの心強さ', axis: 'team' },
      { label: '資格がなくても育ててもらえること', axis: 'grow' },
    ],
    bye: { who: 'a', text: 'また明日ね！気をつけて帰ってね👋', face: 2 },
    stamp: 'img/chelper_cheer.webp',
  },

  /* 結果で出す「惹かれたポイント」と見学メモ */
  axes: {
    kizuki:  { label: '人の小さな変化に気づける仕事', tags: ['#見守り', '#申し送り', '#早めに気づく'], memo: '朝の申し送りで、どんなことを伝え合っている？' },
    yorisoi: { label: '一人ひとりの人生に寄り添える仕事', tags: ['#その人らしさ', '#ありがとう', '#笑顔'], memo: 'ホームの雰囲気や、入居者さんとの会話の様子を見てみる' },
    team:    { label: 'ひとりにさせない、チームの職場', tags: ['#先輩が同行', '#作戦会議', '#ひとりじゃない'], memo: 'チームでの話し合いや、先輩の教え方を見てみる' },
    grow:    { label: '資格ゼロから育ててくれる環境', tags: ['#学費は会社負担', '#同期と研修', '#USJ研修'], memo: '入社してから資格をとった先輩の話を聞いてみる' },
  },
  memoExtra: ['入社1年目の1日の流れを聞いてみる'],

  /* 結果カードの写真（1枚目が大きく入る） */
  cardPhotos: [
    { img: 'img/p_hero.webp', stamp: '10:30', pos: '50% 25%' },
    { img: 'img/p_meal.webp', stamp: '12:00' },
    { img: 'img/p_team.webp', stamp: '14:00' },
  ],

  info: [
    '職場見学はいつでも歓迎。遠くの人はオンライン見学もできます。',
    '高校生の応募・見学の申し込みは、進路指導の先生を通して行います。',
    'お問い合わせ：0120-85-3131（9:00〜18:00・月〜土）',
  ],
  shareText: '「おいでよ、介護の1日。」日本介護医療センターの介護スタッフの1日を体験しました。',

  credit: '写真・イラストはイメージです。登場する先輩・入居者さん・会話は、日本介護医療センターの採用サイトの先輩の声や公開情報をもとにした演出です。',
};
