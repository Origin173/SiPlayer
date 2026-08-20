# Changelog

SiPlayer release history. Entries are generated from Git tags and commit messages.

<!-- release entries -->

## 0.1.0-alpha.2

`2026-08-20`

### 🐛 Fixes

- set EAS local workdir in a step ([b4690ca](https://github.com/Origin173/SiPlayer/commit/b4690ca57678e75f9e70b91d8611b8c9da106e6b))
- avoid timers for pre-aborted requests ([3c18a76](https://github.com/Origin173/SiPlayer/commit/3c18a761ebc48aa970f9084bcaf6de3bf0b7eaf4))
- preserve shuffle history across rounds ([cffdfea](https://github.com/Origin173/SiPlayer/commit/cffdfeaed9fd6d4c73d7563bee9aa0858e8a6363))
- validate every workspace version ([0d3f8a7](https://github.com/Origin173/SiPlayer/commit/0d3f8a73bffad9fa0df5ee1a6159d88bacfd7ed8))
- inject and validate public gateway URL ([32c7aee](https://github.com/Origin173/SiPlayer/commit/32c7aee025dcf25edd07bbae1b53044a9af8c807))
- invalidate pending playback on queue clear ([ac044b9](https://github.com/Origin173/SiPlayer/commit/ac044b9225e784b6b3e59f4cecf5152ede04a064))
- clear UI state when session cleanup fails ([0ec4f18](https://github.com/Origin173/SiPlayer/commit/0ec4f189caf5b39030cbbaa18522618b3098368f))
- support Web session storage ([e6c4ec4](https://github.com/Origin173/SiPlayer/commit/e6c4ec4c6702c1356dfafde9b8112f3ab6ed15a9))
- make QR authorization idempotent ([9880f48](https://github.com/Origin173/SiPlayer/commit/9880f48ef7222fdcc9ec3bc3dbe22f6f0bce7a94))
- delegate playlist shuffle to player ([5b3fe26](https://github.com/Origin173/SiPlayer/commit/5b3fe266ed705faf736afc227d2e40a4b1e81e27))
- advertise rate-limit retry windows ([c4c1814](https://github.com/Origin173/SiPlayer/commit/c4c1814627b869750b4afd023d3eb1a76531bc5e))
- exclude CORS preflight from rate limits ([7608c21](https://github.com/Origin173/SiPlayer/commit/7608c21e88744534dc32b1a0b77530e8423cb125))
- canonicalize response cache keys ([11c1b02](https://github.com/Origin173/SiPlayer/commit/11c1b02715bd99ed3566b8c156bfd10fd12819c9))
- show real MiniPlayer progress ([6bbbf97](https://github.com/Origin173/SiPlayer/commit/6bbbf97d6c68c88cddde5ac645de2b4131e5f12a))
- validate all workspace package versions ([bf413f9](https://github.com/Origin173/SiPlayer/commit/bf413f96df54cd889e3c67abf1268609e611363f))
- pin Expo tooling and build images ([5863a55](https://github.com/Origin173/SiPlayer/commit/5863a557803176482f24801e172cb003f11d2596))
- merge top-level detail privileges ([d2b56fa](https://github.com/Origin173/SiPlayer/commit/d2b56fa1b60cc11cfeb9f9e790f472b0e4e8af02))
- prefer upstream stream quality metadata ([874635a](https://github.com/Origin173/SiPlayer/commit/874635a9e4b430531376d60f06fac77adcd01b67))
- reserve space for player overlays ([05141b3](https://github.com/Origin173/SiPlayer/commit/05141b3394f7280612cf87e6c814b7e08f195a0d))
- deduplicate paginated search results ([5c2676d](https://github.com/Origin173/SiPlayer/commit/5c2676dfd5e204f1e2be3efd931e3ab82d53ec9a))
- record recent tracks after playback starts ([0d40ac3](https://github.com/Origin173/SiPlayer/commit/0d40ac3969775157834b4a521a814e173aac1f4a))
- preserve position on stream retry ([91930c8](https://github.com/Origin173/SiPlayer/commit/91930c85fc1d5329bac8f4a50e96b3c2df142834))
- synchronize liked metadata in queue ([02121d1](https://github.com/Origin173/SiPlayer/commit/02121d18412a3f088c0fca8516f38c6635c0d31f))
- preserve shuffle order and history ([a862cb9](https://github.com/Origin173/SiPlayer/commit/a862cb9dfcda588962ff0653943c0192ae93df7b))
- clamp seek positions to duration ([f09c37b](https://github.com/Origin173/SiPlayer/commit/f09c37b008be1e940cc8fd84bdc138cbae0aad66))
- serialize search history writes ([f9f62b5](https://github.com/Origin173/SiPlayer/commit/f9f62b57374dd00c725124cf70983a1981a892ee))
- serialize local history writes ([22ce67c](https://github.com/Origin173/SiPlayer/commit/22ce67c3cbd48bdb8043720e035bf2cbf9753b23))
- bundle Gateway as a standalone artifact ([fd9bb15](https://github.com/Origin173/SiPlayer/commit/fd9bb1536e3cd15728138385ecfd5c25564d4379))
- paginate user playlists ([2c7f494](https://github.com/Origin173/SiPlayer/commit/2c7f494cb2576768e06e24a08607bf88032351bd))
- load playlists beyond 500 tracks ([def434f](https://github.com/Origin173/SiPlayer/commit/def434fcf84ad6b46e3f0d78e0fe5b7f4058d036))
- require explicit production session storage ([adacb6b](https://github.com/Origin173/SiPlayer/commit/adacb6b2f7c657b201c8f97b72d6484a35bc45ff))
- merge cloud and local recent tracks ([b0fef6e](https://github.com/Origin173/SiPlayer/commit/b0fef6e3fbc3e2f2034845b85ac82d683363de50))
- map high quality to exhigh ([4a4e9f2](https://github.com/Origin173/SiPlayer/commit/4a4e9f221c04a3e4c7386d3304fc5877b9108e92))
- return 401 when authentication is required ([9b99411](https://github.com/Origin173/SiPlayer/commit/9b9941167318a46df3219d9590923e8ef81e7aff))
- reissue request ids on cache hits ([e67ee21](https://github.com/Origin173/SiPlayer/commit/e67ee21f51e30b624a32573edd7e55a9677e190e))
- base playback availability on playback privilege ([5e644da](https://github.com/Origin173/SiPlayer/commit/5e644da1965c5774d40f653f4b07edb93a364b25))
- make QR login terminal and retry transient errors ([de986fb](https://github.com/Origin173/SiPlayer/commit/de986fbc052fa52a2c8d0f2709bd314b93bbcf54))
- republish existing release artifacts ([84e8be3](https://github.com/Origin173/SiPlayer/commit/84e8be34401368ce4422a0b737d423d512064708))

### 📚 Documentation

- document local native build workflow ([9bdad9a](https://github.com/Origin173/SiPlayer/commit/9bdad9acf1011df15cb8e5d6181eab94b9a74b1c))
- add AGENTS.md ([19979b6](https://github.com/Origin173/SiPlayer/commit/19979b68f79492ac11d519f1769b0141d24add6e))
- declare file session store single-instance ([4ca7dd1](https://github.com/Origin173/SiPlayer/commit/4ca7dd1e79d0c7634105d2a39f5a261d9c2bf33f))

### ✅ Tests

- mock safe area in search screen ([8d8d069](https://github.com/Origin173/SiPlayer/commit/8d8d06991a53e5817198fd0e3e6bda17e2522675))
- verify web session storage contract ([174dfbe](https://github.com/Origin173/SiPlayer/commit/174dfbed54ba96512c2b5bd153e8e8cdf6f2c464))

### 📦 Maintenance

- migrate native builds to local EAS ([0835b85](https://github.com/Origin173/SiPlayer/commit/0835b85672b29d9a2005827bff52206a9f9bb387))
- require supported Node.js version ([d0ea770](https://github.com/Origin173/SiPlayer/commit/d0ea7700cf5966f884ea24caaa66a6e78c9ad295))
- remove unused MiniPlayer style ([d47df68](https://github.com/Origin173/SiPlayer/commit/d47df681fe7f62ab75af666fe3c029be22223a82))

## 0.1.0-alpha.1

`2026-08-19`

### ✨ Features

- honor reduce motion setting ([42e3bd3](https://github.com/Origin173/SiPlayer/commit/42e3bd3b4fd7a7e673e6c8b1514ed0bc2e923c54))
- recover sessions from encrypted backup ([0ac9014](https://github.com/Origin173/SiPlayer/commit/0ac901402223cd58a0d18b3b02aa9ee2bb08d61e))
- cache public content responses ([0a8189b](https://github.com/Origin173/SiPlayer/commit/0a8189be2c99ae03477475162007705f3d32a1e0))
- add request and upstream metrics ([171cf83](https://github.com/Origin173/SiPlayer/commit/171cf832581bfa7a04d04bb73a41a26089e45493))
- close search and queue playback contracts ([022000c](https://github.com/Origin173/SiPlayer/commit/022000c56b9762a448146fe53183ef0958f365ed))
- harden playback and auth lifecycles ([2a64971](https://github.com/Origin173/SiPlayer/commit/2a64971a3909a53dc977094993986be7967999a8))
- support accessible queue reordering ([f7f732d](https://github.com/Origin173/SiPlayer/commit/f7f732d1e36b5a3f8d2697678cd362673a98205a))
- add album and artist detail flows ([61822f6](https://github.com/Origin173/SiPlayer/commit/61822f69cbc32b0726cc243ce9b2390131f54fbf))
- load paginated track results ([274ed8d](https://github.com/Origin173/SiPlayer/commit/274ed8ded09d1d98443b34650db850fac0e89f40))
- persist playback and theme preferences ([d61d15b](https://github.com/Origin173/SiPlayer/commit/d61d15befde5ac4b04d994bcf7ad8f8f176ddb91))
- support album artist and playlist queries ([505cab6](https://github.com/Origin173/SiPlayer/commit/505cab6edfd6a35c78def7ff313ac35b71f0d0b5))
- persist encrypted sessions across restarts ([de8ca6f](https://github.com/Origin173/SiPlayer/commit/de8ca6f028ca629a3cc10d9d8d6fe8956786e707))
- add now playing bottom sheet ([bd606f9](https://github.com/Origin173/SiPlayer/commit/bd606f94f82fede8880a43bb5c81e55a71e4ded9))
- add quality playback and service controls ([1f2183a](https://github.com/Origin173/SiPlayer/commit/1f2183aa8c6056db8642a72b933780e2a5455a24))
- add shuffle action ([5e778f7](https://github.com/Origin173/SiPlayer/commit/5e778f7cb3c5c076a1fa07cdd26d6a3b2f7b72bb))
- persist history and debounce queries ([9c975ba](https://github.com/Origin173/SiPlayer/commit/9c975ba0f2ef3e9a958591dbf85ee0c0e7a31fbd))
- expose synced liked songs ([3bcd22e](https://github.com/Origin173/SiPlayer/commit/3bcd22eb37cdfa221d2ca28c640c5a01cd4d700e))
- connect detail screen to gateway ([0af3721](https://github.com/Origin173/SiPlayer/commit/0af372178fd1b82c66b13195c6461ffe33881a56))
- configure request rate limits ([39f859c](https://github.com/Origin173/SiPlayer/commit/39f859c7e73ef2fdd654329dd72941ef5eb961a3))
- show real recent tracks and playlists ([cf48a14](https://github.com/Origin173/SiPlayer/commit/cf48a1485f30170d3a43765e8f411778740102fb))
- polish modes and queue controls ([12ff32e](https://github.com/Origin173/SiPlayer/commit/12ff32e8ab4db36cfe5e0243c8be3841095d2e06))
- add local history and track likes ([167bb07](https://github.com/Origin173/SiPlayer/commit/167bb07c3511d9347c62243e033c1b308e577f45))
- add secure QR sessions and synced library ([0c77b30](https://github.com/Origin173/SiPlayer/commit/0c77b308b678d40150207f9e2252c36bfe26d966))
- add synced lyrics screen ([25c8c28](https://github.com/Origin173/SiPlayer/commit/25c8c280446c92b677cf00c625245a02ccedbf88))
- resolve streams and enable expo audio ([4d3fcdb](https://github.com/Origin173/SiPlayer/commit/4d3fcdb989905523e4bc0105e395c9e20ca672ce))
- connect mobile query state to gateway ([a8f334b](https://github.com/Origin173/SiPlayer/commit/a8f334bec4ab2ff54087ba715cbfcc89db55999b))
- add normalized content adapter ([1ec2745](https://github.com/Origin173/SiPlayer/commit/1ec27457f7cf72c91e8f341f38805052c7a4f45c))
- add UI shell and global mock player ([e2a2ed9](https://github.com/Origin173/SiPlayer/commit/e2a2ed9574d2f20f93e46069d284c3d20d7fc853))

### 🐛 Fixes

- declare eas project id in dynamic config ([7b74106](https://github.com/Origin173/SiPlayer/commit/7b7410693618ed9c4ca0013ff591bec1d5b9b8d9))
- emit runnable node esm imports ([e5cdca1](https://github.com/Origin173/SiPlayer/commit/e5cdca160563a112522c13ae9a71ad4b74a0dad0))
- run eas builds from mobile app root ([d835f50](https://github.com/Origin173/SiPlayer/commit/d835f5052e5b372c4f0a8ff5736f1b71a9c4d7f8))
- remove empty queue branch ([3c7548b](https://github.com/Origin173/SiPlayer/commit/3c7548bd7f0f03e61ea6862e2d9d8ae687851572))
- classify upstream rate limits ([ba73754](https://github.com/Origin173/SiPlayer/commit/ba7375424c5fa9db50e65905173ca26aad7f4b6a))
- harden session persistence defaults ([43de9e2](https://github.com/Origin173/SiPlayer/commit/43de9e25a027ee54c12550d98f6d51e13e002631))
- cancel stale playback transitions ([81b417c](https://github.com/Origin173/SiPlayer/commit/81b417cdb01c507e811ac0c31885f64dcd39e1b2))
- classify smoke gateway errors ([5837f2e](https://github.com/Origin173/SiPlayer/commit/5837f2e543d54c278b7fe2ee0e99d768046cc4dd))
- make proxy trust and session failures observable ([fa6d737](https://github.com/Origin173/SiPlayer/commit/fa6d7376853799820f7ab6e864d4e95e73a7bc17))
- paginate catalog search and readiness ([105f8bd](https://github.com/Origin173/SiPlayer/commit/105f8bdee1328f2fdf14f52be6a712c178185705))
- preserve queue removal and settings updates ([5987c67](https://github.com/Origin173/SiPlayer/commit/5987c67b17574fd0292b6db6616cc05adac0859e))
- support settings storage on web ([a08f4ed](https://github.com/Origin173/SiPlayer/commit/a08f4ed44fe7aa16647cf13060cdae8ec34f0573))
- atomically persist sessions ([eaefbf0](https://github.com/Origin173/SiPlayer/commit/eaefbf0d87ade1b556d216f4f2be61c96eedc8b3))
- preserve catalog search item kinds ([d1f7078](https://github.com/Origin173/SiPlayer/commit/d1f70786bcbe2f57164f36d91a72aec893142ab8))
- open queue from mini player and allow like CORS ([6cabdce](https://github.com/Origin173/SiPlayer/commit/6cabdcec2fc0639200718c7c6bb5da4108c4ee5a))
- refresh local history after playback ([06db914](https://github.com/Origin173/SiPlayer/commit/06db9149071140633559a3308413957bf8fcd1d6))
- clear mobile session when gateway expires ([0fe3a46](https://github.com/Origin173/SiPlayer/commit/0fe3a46112bcfd459b9bf4026a62a0281661af4e))
- handle upstream session expiry and readiness ([f251e6e](https://github.com/Origin173/SiPlayer/commit/f251e6ea1d741c2da29266bdcd621c0196dbacb4))
- surface playback failures and bound client requests ([b2a4a1f](https://github.com/Origin173/SiPlayer/commit/b2a4a1f2a20d76a2890ec4b4c3a06d041095205c))
- normalize persisted profile contract errors ([d4cb918](https://github.com/Origin173/SiPlayer/commit/d4cb9189591b36399ae85469160a83668b91a25f))
- enlarge seek touch target ([1e5683d](https://github.com/Origin173/SiPlayer/commit/1e5683d04b0bfff9e23ff56a37632b1a2bec6e4d))
- validate QR and session response envelopes ([25f6084](https://github.com/Origin173/SiPlayer/commit/25f608413f8e8b7209fb18edafaf897401876226))
- show playlist retry state ([60de4d1](https://github.com/Origin173/SiPlayer/commit/60de4d1877246c8d6d012a329228485143e7e4b2))
- enforce production security and contracts ([9990e7e](https://github.com/Origin173/SiPlayer/commit/9990e7e984190b805ce550e7caea07b27ef2afe3))
- make now playing seek draggable ([fa76146](https://github.com/Origin173/SiPlayer/commit/fa7614642114e5b549842777381db7c5b59d0870))
- reject upstream error envelopes ([1167f0c](https://github.com/Origin173/SiPlayer/commit/1167f0c8877460e278050769a8b3ac6e7385ba14))
- support web client CORS preflight ([25df86c](https://github.com/Origin173/SiPlayer/commit/25df86c315413a5e35aae633075ed9515d220e10))
- clear private query cache on logout ([804e1d2](https://github.com/Origin173/SiPlayer/commit/804e1d27aa2f2b017ff1dabca394f1b064a51eed))
- wait for secure session hydration ([d2c579b](https://github.com/Origin173/SiPlayer/commit/d2c579b9ec3c211cd24e37fe5246f02c2340f196))
- preserve progress while editing queue ([cb92b9d](https://github.com/Origin173/SiPlayer/commit/cb92b9d8c02834d06306bd1242fdc267001a0432))

### ⚡ Performance

- virtualize artist detail list ([dc2f3ba](https://github.com/Origin173/SiPlayer/commit/dc2f3ba498f0bc5d0cc723253b550f0268fba064))
- batch large catalog detail requests ([5bee1bc](https://github.com/Origin173/SiPlayer/commit/5bee1bc1a011db0225ecc527186cb8b6aab97ce2))

### 🛠 Improvements

- separate queue replacement from mutation ([47e1a34](https://github.com/Origin173/SiPlayer/commit/47e1a34b5f0eaf9ff76adafa08469934e8e5e02c))
- expose safe URL mapper ([808515f](https://github.com/Origin173/SiPlayer/commit/808515fdb346063a93f5670d0e5d65cc6875f53e))

### 📚 Documentation

- clarify one-time eas setup ([934e324](https://github.com/Origin173/SiPlayer/commit/934e32466399e12c057f4cfc374895d2855daf0d))
- document release secrets and variables ([4951df1](https://github.com/Origin173/SiPlayer/commit/4951df13e5264c8915f910d77bc4ed14a82ac3d1))
- add local usage test guide ([b55119b](https://github.com/Origin173/SiPlayer/commit/b55119bafa04249da303f9afad1c712525d9362f))
- document production gateway settings ([df2e782](https://github.com/Origin173/SiPlayer/commit/df2e7822c553da25e1674ca3129588eda174d177))
- pin upstream deployment runbook ([85bcb32](https://github.com/Origin173/SiPlayer/commit/85bcb3277b365f2f96dcedea93fa65e441da09af))
- document allowed origins ([221e974](https://github.com/Origin173/SiPlayer/commit/221e97492a0e7916fc9fa6629540a11fb1e24561))
- document session persistence path ([28ff8e3](https://github.com/Origin173/SiPlayer/commit/28ff8e356ad060c17ecd029161ae59bcf3103abd))

### ✅ Tests

- cover metrics aggregation ([6dba444](https://github.com/Origin173/SiPlayer/commit/6dba444446c8ef87850fb525f253ade7696021a8))
- add gateway integration smoke script ([862441c](https://github.com/Origin173/SiPlayer/commit/862441ccda92da816824487ba2e0ecbd5c8e64e4))
- cover catalog search mapping ([7079aa7](https://github.com/Origin173/SiPlayer/commit/7079aa7f87b1c19176544486b4d733959c7e3265))
- cover rate limiting and home errors ([ca6ebd0](https://github.com/Origin173/SiPlayer/commit/ca6ebd0d040cc9b46707fe4bc69eac134720aaf0))

### 📦 Maintenance

- pause ios builds without apple credentials ([8b4da5f](https://github.com/Origin173/SiPlayer/commit/8b4da5f8894ef33a44d3d8ae10d9e97899e12af2))
- build native releases with eas ([edde5c5](https://github.com/Origin173/SiPlayer/commit/edde5c501901649edd9d519825ef4715195efc64))
- publish releases from version tags ([9573a69](https://github.com/Origin173/SiPlayer/commit/9573a69d08314fc3c18e999263cc5b7b0cc108a2))
- harden gateway smoke checks ([24f178b](https://github.com/Origin173/SiPlayer/commit/24f178b403b42d52cd0565561e45effc46f56d6c))
- ignore local test guide ([26f1556](https://github.com/Origin173/SiPlayer/commit/26f1556b32566864aa690c2c770f2b5bed704e5e))
- verify mobile export and expo compatibility ([8f2df9b](https://github.com/Origin173/SiPlayer/commit/8f2df9be1153cdf5b9f37de350efda37f09b17cd))
- register dev client config plugin ([c771d17](https://github.com/Origin173/SiPlayer/commit/c771d17ff00baf2c5f620dba0b9d95078cf14c05))
- configure EAS development builds ([3359b6a](https://github.com/Origin173/SiPlayer/commit/3359b6a5c569cac62bb7ab42935ac1f57c808ab9))
- add workspace quality gate ([4d5de08](https://github.com/Origin173/SiPlayer/commit/4d5de08cae387409980967e9ae64e68bfdaac3c3))
- add rate limiting and session cleanup ([d347574](https://github.com/Origin173/SiPlayer/commit/d3475748b4b6f141b8d8c4505966211e3e34fa02))
- establish monorepo foundation ([efde0f6](https://github.com/Origin173/SiPlayer/commit/efde0f64b65b62bee7eeec97e0e2375212746c13))

### 📝 Other changes

- Initial commit ([72bdd30](https://github.com/Origin173/SiPlayer/commit/72bdd30a46082ca99072c7ce24038b17c35ae856))

