# Changelog

## [0.20.1](https://github.com/Notifycal/backend/compare/v0.20.0...v0.20.1) (2025-03-31)


### Bug Fixes

* review logging. Replace json stringify by log with attributes. T… ([#464](https://github.com/Notifycal/backend/issues/464)) ([543fbfa](https://github.com/Notifycal/backend/commit/543fbfab12350191a31ee8bd48914361a74cc86f))

## [0.20.0](https://github.com/Notifycal/backend/compare/v0.19.0...v0.20.0) (2025-03-28)


### Features

* messaging service (and webhook) ([039f122](https://github.com/Notifycal/backend/commit/039f1220f9a948d945ec24e52e5c67edfcf550b8))

## [0.19.0](https://github.com/Notifycal/backend/compare/v0.18.1...v0.19.0) (2025-03-27)


### Features

* accept sender number patch endpoint ([#409](https://github.com/Notifycal/backend/issues/409)) ([8949ee1](https://github.com/Notifycal/backend/commit/8949ee13432d576bfd9a7a103176cb48b9888d58))

## [0.18.1](https://github.com/Notifycal/backend/compare/v0.18.0...v0.18.1) (2025-03-19)


### Bug Fixes

* add `function_name` default dimension to Powertools metrics ([#444](https://github.com/Notifycal/backend/issues/444)) ([a8c4ea8](https://github.com/Notifycal/backend/commit/a8c4ea8a317465bf696848e6a47fea0332bbf1e3))
* deploy into local env without observability ([#432](https://github.com/Notifycal/backend/issues/432)) ([52a61db](https://github.com/Notifycal/backend/commit/52a61db27d54f776c65b311caefd42ac515b6196))
* **local:** tweak query parameters so express understands them ([#437](https://github.com/Notifycal/backend/issues/437)) ([c069fbf](https://github.com/Notifycal/backend/commit/c069fbf8e5041e603842820e1a9fa751f93983bd))

## [0.18.0](https://github.com/Notifycal/backend/compare/v0.17.0...v0.18.0) (2025-03-13)


### Features

* advanced openapi spec bundling with redocly ([#418](https://github.com/Notifycal/backend/issues/418)) ([a3ea3f1](https://github.com/Notifycal/backend/commit/a3ea3f1783da4796d0e2a363cf49689968a02465))
* observability first pass. Slack notifier. Global lambda alarms … ([#428](https://github.com/Notifycal/backend/issues/428)) ([dcf6f09](https://github.com/Notifycal/backend/commit/dcf6f09fe2da7e50556fb06c4420131f2195f397))


### Bug Fixes

* EventBridge events could end up in audit trail, therefore it nee… ([#429](https://github.com/Notifycal/backend/issues/429)) ([96d4949](https://github.com/Notifycal/backend/commit/96d4949324fcc9b58e4943012473a58ab20e4187))
* extract `sensitiveData` out of `baseEvent` / `eventSchemaGenerator` ([#420](https://github.com/Notifycal/backend/issues/420)) ([64b9ffd](https://github.com/Notifycal/backend/commit/64b9ffd28d91022a4309841d03d87e26728f0fad))
* mistake in field format of openapi spec ([#421](https://github.com/Notifycal/backend/issues/421)) ([3971fd6](https://github.com/Notifycal/backend/commit/3971fd661e0e11bebfdd7cd363250bbcf726ee29))
* set serviceName and namespace for metrics and logger ([#411](https://github.com/Notifycal/backend/issues/411)) ([eb19e3d](https://github.com/Notifycal/backend/commit/eb19e3d26ff9e01f69eb44d251fee0c30e5df40d))

## [0.17.0](https://github.com/Notifycal/backend/compare/v0.16.0...v0.17.0) (2025-02-27)


### Features

* async config-reader for SSM parameter retrieval ([#391](https://github.com/Notifycal/backend/issues/391)) ([db7b874](https://github.com/Notifycal/backend/commit/db7b8744ec95a77d13677e7539a74357d36b641f))
* handle senderDetails so it can be both SMS or RCS ([#394](https://github.com/Notifycal/backend/issues/394)) ([d3042d5](https://github.com/Notifycal/backend/commit/d3042d5a6e7a87de6aee2f26065c663968205565))

## [0.16.0](https://github.com/Notifycal/backend/compare/v0.15.12...v0.16.0) (2025-02-26)


### Features

* make reminder template configurable ([#380](https://github.com/Notifycal/backend/issues/380)) ([c2e5d5f](https://github.com/Notifycal/backend/commit/c2e5d5f331383704a5e5664f314193e49354e6c0))


### Bug Fixes

* rename senderDetails to receiverDetails ([#393](https://github.com/Notifycal/backend/issues/393)) ([27dca63](https://github.com/Notifycal/backend/commit/27dca6308913d20dbc61f61c82d21f73c76186a7))

## [0.15.12](https://github.com/Notifycal/backend/compare/v0.15.11...v0.15.12) (2025-02-20)


### Bug Fixes

* app events refactoring ([#381](https://github.com/Notifycal/backend/issues/381)) ([0154d64](https://github.com/Notifycal/backend/commit/0154d6453d3cae41f38e0ac64969276eef442376))

## [0.15.11](https://github.com/Notifycal/backend/compare/v0.15.10...v0.15.11) (2025-02-18)


### Bug Fixes

* pagination google get events within ([#377](https://github.com/Notifycal/backend/issues/377)) ([a85c598](https://github.com/Notifycal/backend/commit/a85c5984a0c047a8718f3477916fcf1537d72260))
* reminder interpolation ([#376](https://github.com/Notifycal/backend/issues/376)) ([f641af1](https://github.com/Notifycal/backend/commit/f641af1925e1b24d3e8058da54c6f327d2ccf8e8))

## [0.15.10](https://github.com/Notifycal/backend/compare/v0.15.9...v0.15.10) (2025-02-17)


### Bug Fixes

* lambda audit trail dynamo permissions ([a7d0fd7](https://github.com/Notifycal/backend/commit/a7d0fd75723ff114891755a9836fe3540c288a68))

## [0.15.9](https://github.com/Notifycal/backend/compare/v0.15.8...v0.15.9) (2025-02-17)


### Bug Fixes

* unprocessable dlq name ([03ee59b](https://github.com/Notifycal/backend/commit/03ee59b00b7823a277feca54f944f98257cdae17))

## [0.15.8](https://github.com/Notifycal/backend/compare/v0.15.7...v0.15.8) (2025-02-17)


### Bug Fixes

* same queue type as source for global dlq unprocessable ([#372](https://github.com/Notifycal/backend/issues/372)) ([c2398d3](https://github.com/Notifycal/backend/commit/c2398d3843cd48a3d9f48fb371ea5d2489a31f21))

## [0.15.7](https://github.com/Notifycal/backend/compare/v0.15.6...v0.15.7) (2025-02-17)


### Bug Fixes

* previous commit ([db7438d](https://github.com/Notifycal/backend/commit/db7438d05217a880a7617cb428c53b32765ff41b))

## [0.15.6](https://github.com/Notifycal/backend/compare/v0.15.5...v0.15.6) (2025-02-17)


### Bug Fixes

* add another DLQ to get unprocessable messages out of the way so … ([#369](https://github.com/Notifycal/backend/issues/369)) ([ff732cd](https://github.com/Notifycal/backend/commit/ff732cd6dac20e54daefac80171e674c8adc5504))

## [0.15.5](https://github.com/Notifycal/backend/compare/v0.15.4...v0.15.5) (2025-02-17)


### Bug Fixes

* remove fifo params if sending to standard queue. Global dlq is s… ([#367](https://github.com/Notifycal/backend/issues/367)) ([f145266](https://github.com/Notifycal/backend/commit/f1452662dab490917e4b6a831349e7192e7badce))

## [0.15.4](https://github.com/Notifycal/backend/compare/v0.15.3...v0.15.4) (2025-02-17)


### Bug Fixes

* exclude organizers from attendee list in google integration ([#360](https://github.com/Notifycal/backend/issues/360)) ([72affc6](https://github.com/Notifycal/backend/commit/72affc61525400de0bbc5584b3d85d58694dd6d9))

## [0.15.3](https://github.com/Notifycal/backend/compare/v0.15.2...v0.15.3) (2025-02-17)


### Bug Fixes

* processor in sqs lambdas. Calls to record processor were being m… ([#358](https://github.com/Notifycal/backend/issues/358)) ([9fbddee](https://github.com/Notifycal/backend/commit/9fbddeef48fb7ca6e27c419ed39ca1a35c10f04f))

## [0.15.2](https://github.com/Notifycal/backend/compare/v0.15.1...v0.15.2) (2025-02-16)


### Bug Fixes

* desencapsulate sns message for easier reads ([#357](https://github.com/Notifycal/backend/issues/357)) ([fe48fda](https://github.com/Notifycal/backend/commit/fe48fda40b9fffd5a2b33435b4ac7f300f0b2676))
* patching a previous commit ([048aa84](https://github.com/Notifycal/backend/commit/048aa847f4307f999aaf39aeb58a802386774363))

## [0.15.1](https://github.com/Notifycal/backend/compare/v0.15.0...v0.15.1) (2025-02-16)


### Bug Fixes

* various fixes after merging audit trail and actionable events ([#353](https://github.com/Notifycal/backend/issues/353)) ([5d80f1e](https://github.com/Notifycal/backend/commit/5d80f1e3502d4300e80a1ed1f7fb35cc92fc5f57))

## [0.15.0](https://github.com/Notifycal/backend/compare/v0.14.0...v0.15.0) (2025-02-16)


### Features

* audit trail ([#350](https://github.com/Notifycal/backend/issues/350)) ([a5b8bb7](https://github.com/Notifycal/backend/commit/a5b8bb7f896a0015a9b91438aa1b85a3b16a7623))


### Bug Fixes

* revert google integration change ([#351](https://github.com/Notifycal/backend/issues/351)) ([cc8dd8e](https://github.com/Notifycal/backend/commit/cc8dd8ea967d970bc6067f531aad5e83151e0c98))

## [0.14.0](https://github.com/Notifycal/backend/compare/v0.13.0...v0.14.0) (2025-02-14)


### Features

* actionable events lambda. ([#343](https://github.com/Notifycal/backend/issues/343)) ([b69a57c](https://github.com/Notifycal/backend/commit/b69a57c60a8d33d553061c19aff63a87eae61aa1))
* add global dlqs as error sink ([#342](https://github.com/Notifycal/backend/issues/342)) ([a9deeb0](https://github.com/Notifycal/backend/commit/a9deeb080e2982f0210d2e8aa106ea033efdf58e))
* batch processing in sqs lambda ([#338](https://github.com/Notifycal/backend/issues/338)) ([51138f4](https://github.com/Notifycal/backend/commit/51138f4cd1ddee07924bb4ad4d567c19fe3afc84))
* run start time for actionable events ([#339](https://github.com/Notifycal/backend/issues/339)) ([e665af0](https://github.com/Notifycal/backend/commit/e665af06c71f3b9511734994d467e6a442dc9006))


### Bug Fixes

* sqs queue values for fifo and content_based_deduplication ([#340](https://github.com/Notifycal/backend/issues/340)) ([5b80581](https://github.com/Notifycal/backend/commit/5b805813b23c5954c28d45fd36c750a40ce9bd22))

## [0.13.0](https://github.com/Notifycal/backend/compare/v0.12.0...v0.13.0) (2025-02-11)


### Features

* bg processing middleware. Adapt httpEventParser for reuse. Some… ([#327](https://github.com/Notifycal/backend/issues/327)) ([46751fb](https://github.com/Notifycal/backend/commit/46751fbc83c31193bf7fa9cb2bf1cd83d1e03cbf))
* google get events within ([#334](https://github.com/Notifycal/backend/issues/334)) ([a9cde3d](https://github.com/Notifycal/backend/commit/a9cde3d4f32db314964c23ef868f9929794cc125))


### Bug Fixes

* disable lambda retries for now ([#337](https://github.com/Notifycal/backend/issues/337)) ([4ed52fa](https://github.com/Notifycal/backend/commit/4ed52fa197875f67035d7a82ffea97fe793da4d9))
* make cron run every 30 mins ([#325](https://github.com/Notifycal/backend/issues/325)) ([3f07047](https://github.com/Notifycal/backend/commit/3f07047ee317be3652b4efac9ad3da2b596393a7))

## [0.12.0](https://github.com/Notifycal/backend/compare/v0.11.3...v0.12.0) (2025-02-07)


### Features

* enable SNS active tracing + policy ([#321](https://github.com/Notifycal/backend/issues/321)) ([5d80fea](https://github.com/Notifycal/backend/commit/5d80fea317457e32a6d3efc2a6a0b52dba0b9021))

## [0.11.3](https://github.com/Notifycal/backend/compare/v0.11.2...v0.11.3) (2025-02-07)


### Bug Fixes

* SNS delivers messages to SQS not to lambda, duh ([#322](https://github.com/Notifycal/backend/issues/322)) ([4c2f417](https://github.com/Notifycal/backend/commit/4c2f41756b60820644f16c3ca49767aca21d9a5c))

## [0.11.2](https://github.com/Notifycal/backend/compare/v0.11.1...v0.11.2) (2025-02-07)


### Bug Fixes

* flatmap and enable SNS delivery status feedback ([#319](https://github.com/Notifycal/backend/issues/319)) ([b2ad2fa](https://github.com/Notifycal/backend/commit/b2ad2fae54bcd64e67dc4208f908e3b6f1a37388))

## [0.11.1](https://github.com/Notifycal/backend/compare/v0.11.0...v0.11.1) (2025-02-06)


### Bug Fixes

* actionable events queue name ([#316](https://github.com/Notifycal/backend/issues/316)) ([4b60eb1](https://github.com/Notifycal/backend/commit/4b60eb1d14e6b92d2cda85eb00cdb459d08c5c5b))
* pin provider versions ([#318](https://github.com/Notifycal/backend/issues/318)) ([03bf0f0](https://github.com/Notifycal/backend/commit/03bf0f07e2e1a7a35150131783aed61c5a69e83e))
* Sns service logging. Setup retry mode too. ([#315](https://github.com/Notifycal/backend/issues/315)) ([8402bf8](https://github.com/Notifycal/backend/commit/8402bf8c900ad9e72d2e29059bd268353c6903d4))

## [0.11.0](https://github.com/Notifycal/backend/compare/v0.10.1...v0.11.0) (2025-02-06)


### Features

* actionable events structure. WIP: IaC is left ([#311](https://github.com/Notifycal/backend/issues/311)) ([d8c4c12](https://github.com/Notifycal/backend/commit/d8c4c12a8c83f57656b3157271566c66289d2b7e))
* contacts service and google impl ([#309](https://github.com/Notifycal/backend/issues/309)) ([6c1fdff](https://github.com/Notifycal/backend/commit/6c1fdff8c0019a3e528d3832556dd2c0eac0de24))


### Bug Fixes

* the scheduled lambda does not need the protected endpoint env vars ([#314](https://github.com/Notifycal/backend/issues/314)) ([f818e16](https://github.com/Notifycal/backend/commit/f818e165d8b1bb7ee065f8ce2ec467122fc4b775))

## [0.10.1](https://github.com/Notifycal/backend/compare/v0.10.0...v0.10.1) (2025-02-06)


### Bug Fixes

* remove ignore_changes from GSI (localstack bug) ([#310](https://github.com/Notifycal/backend/issues/310)) ([2a75a18](https://github.com/Notifycal/backend/commit/2a75a189666193af2cabded458799c92a662364f))

## [0.10.0](https://github.com/Notifycal/backend/compare/v0.9.7...v0.10.0) (2025-02-06)


### Features

* fanout SNS and SQS. Provision user calendar fetched topic and q… ([#300](https://github.com/Notifycal/backend/issues/300)) ([28a30c2](https://github.com/Notifycal/backend/commit/28a30c234ff0ac94ba93c189949b58d7d400c394))
* fetch live Users x calendar ([#301](https://github.com/Notifycal/backend/issues/301)) ([8391c07](https://github.com/Notifycal/backend/commit/8391c077cb0f6d9b04380106a51f840843be4334))

## [0.9.7](https://github.com/Notifycal/backend/compare/v0.9.6...v0.9.7) (2025-01-31)


### Bug Fixes

* add policy to PATCH user-profile ([ce31da8](https://github.com/Notifycal/backend/commit/ce31da8027f60aff1d9e65bfb6a3531717c9b0fe))

## [0.9.6](https://github.com/Notifycal/backend/compare/v0.9.5...v0.9.6) (2025-01-31)


### Bug Fixes

* attach policy to get idp user-calendars as it is querying users table ([c886e45](https://github.com/Notifycal/backend/commit/c886e4520a7440dec220b122f2751e2a81700502))

## [0.9.5](https://github.com/Notifycal/backend/compare/v0.9.4...v0.9.5) (2025-01-31)


### Bug Fixes

* increase memory in GET idp-user-calendars ([6a0cc1f](https://github.com/Notifycal/backend/commit/6a0cc1f9846b92a75cb9dc37fb52f1fcedf3bf12))

## [0.9.4](https://github.com/Notifycal/backend/compare/v0.9.3...v0.9.4) (2025-01-31)


### Bug Fixes

* release previous commit ([3043713](https://github.com/Notifycal/backend/commit/3043713ef409243722e0d592005c2d9adc64601a))

## [0.9.3](https://github.com/Notifycal/backend/compare/v0.9.2...v0.9.3) (2025-01-31)


### Bug Fixes

* refresh dynamo permissions ([#274](https://github.com/Notifycal/backend/issues/274)) ([602c654](https://github.com/Notifycal/backend/commit/602c65441e37f41ec9de731025fab59868d641b5))

## [0.9.2](https://github.com/Notifycal/backend/compare/v0.9.1...v0.9.2) (2025-01-30)


### Bug Fixes

* openapi spec ([aa38658](https://github.com/Notifycal/backend/commit/aa38658595ec9c28860351ee4c90f62c5e3c783d))

## [0.9.1](https://github.com/Notifycal/backend/compare/v0.9.0...v0.9.1) (2025-01-30)


### Bug Fixes

* (breaking TBH) separate persistance model from api model ([#266](https://github.com/Notifycal/backend/issues/266)) ([47ed831](https://github.com/Notifycal/backend/commit/47ed831dbe980edf14e2f9aed49324782e6f4f5c))
* log google requests ([#265](https://github.com/Notifycal/backend/issues/265)) ([dc7597b](https://github.com/Notifycal/backend/commit/dc7597b664820f74aaee42dd7c46b4bdc5d45bb7))
* trigger release ([6ba171d](https://github.com/Notifycal/backend/commit/6ba171d8215f594217b8d2142ba2d0fea36c5983))

## [0.9.0](https://github.com/Notifycal/backend/compare/v0.8.0...v0.9.0) (2025-01-29)


### Features

* patch user profile endpoint ([#263](https://github.com/Notifycal/backend/issues/263)) ([1089a59](https://github.com/Notifycal/backend/commit/1089a59a0f4df1734fafac68116bfad01cc41e0e))

## [0.8.0](https://github.com/Notifycal/backend/compare/v0.7.1...v0.8.0) (2025-01-28)


### Features

* idp agnositic user-calendar endpoint. With google impl ([#240](https://github.com/Notifycal/backend/issues/240)) ([e96edda](https://github.com/Notifycal/backend/commit/e96eddaf0dfc6e81fe497eaa575ca8bc1937c51d))

## [0.7.1](https://github.com/Notifycal/backend/compare/v0.7.0...v0.7.1) (2025-01-27)


### Bug Fixes

* since Users table no longer performs GetItem but it queries the table, permissions have to be tweaked ([#254](https://github.com/Notifycal/backend/issues/254)) ([c95ae21](https://github.com/Notifycal/backend/commit/c95ae215067239d44f1b742441252881124334c4))

## [0.7.0](https://github.com/Notifycal/backend/compare/v0.6.0...v0.7.0) (2025-01-27)


### Features

* generate own keys for JWT access and refresh token ([#241](https://github.com/Notifycal/backend/issues/241)) ([0b9b3ef](https://github.com/Notifycal/backend/commit/0b9b3ef882766e8a87b1ffba23258ff17d6bf626))

## [0.6.0](https://github.com/Notifycal/backend/compare/v0.5.3...v0.6.0) (2025-01-22)


### Features

* store idp authorization on logon ([#237](https://github.com/Notifycal/backend/issues/237)) ([0517e14](https://github.com/Notifycal/backend/commit/0517e1472f51065c64d2f7d1e5beca98278b5bf4))

## [0.5.3](https://github.com/Notifycal/backend/compare/v0.5.2...v0.5.3) (2025-01-19)


### Bug Fixes

* google email verified check. Test coverage ([#228](https://github.com/Notifycal/backend/issues/228)) ([430c65b](https://github.com/Notifycal/backend/commit/430c65bc71dde9fcfd0d7ea872885832c61e98e0))

## [0.5.2](https://github.com/Notifycal/backend/compare/v0.5.1...v0.5.2) (2025-01-19)


### Bug Fixes

* decouple user id from email.  ([#224](https://github.com/Notifycal/backend/issues/224)) ([328dc2b](https://github.com/Notifycal/backend/commit/328dc2b0d99a030f5c17d9918ffe29a68c90d791))

## [0.5.1](https://github.com/Notifycal/backend/compare/v0.5.0...v0.5.1) (2025-01-14)


### Bug Fixes

* local development on localstack ([#217](https://github.com/Notifycal/backend/issues/217)) ([c0c924c](https://github.com/Notifycal/backend/commit/c0c924c170a6f5548bdee84d681537cc96757b48))

## [0.5.0](https://github.com/Notifycal/backend/compare/v0.4.0...v0.5.0) (2025-01-08)


### Features

* enable local development by hiding cloudflare resources and ena… ([#196](https://github.com/Notifycal/backend/issues/196)) ([16459b0](https://github.com/Notifycal/backend/commit/16459b0ccfae42b5a029a8ae3c26d1d73f681443))


### Bug Fixes

* enable deletion protection for dynamo tables ([#193](https://github.com/Notifycal/backend/issues/193)) ([13a6cce](https://github.com/Notifycal/backend/commit/13a6cce9551380053209339d4216e1c3c3827779))

## [0.4.0](https://github.com/Notifycal/backend/compare/v0.3.0...v0.4.0) (2025-01-07)


### Features

* include app_version from release-please when releasing ([#190](https://github.com/Notifycal/backend/issues/190)) ([afe3b4b](https://github.com/Notifycal/backend/commit/afe3b4b43cff2b148377d4ca7e0fbafd460bd13f))

## [0.3.0](https://github.com/Notifycal/backend/compare/v0.2.2...v0.3.0) (2025-01-07)


### Features

* login ban and sign in and up timestamps ([#186](https://github.com/Notifycal/backend/issues/186)) ([7c9dd14](https://github.com/Notifycal/backend/commit/7c9dd14112461bf3223da67bc26d51edeb87dd95))


### Bug Fixes

* define base_domain at stack level as it will not change that often ([#188](https://github.com/Notifycal/backend/issues/188)) ([6dffc2c](https://github.com/Notifycal/backend/commit/6dffc2ca60ab3ae4d92ba7bbc8550432cdaf46b5))

## [0.2.2](https://github.com/Notifycal/backend/compare/v0.2.1...v0.2.2) (2025-01-07)


### Bug Fixes

* api gateway stuff ([#173](https://github.com/Notifycal/backend/issues/173)) [skip ci] ([cf2ff87](https://github.com/Notifycal/backend/commit/cf2ff873fc1d25ad374c5014d291506d14f8e71f))
* lambda integration with the Real World (tm) ([#174](https://github.com/Notifycal/backend/issues/174)) ([c3b9ee5](https://github.com/Notifycal/backend/commit/c3b9ee514f53de45d79c22a4fdebb8548d23bb69))
* use right table for refresh tokens ([#176](https://github.com/Notifycal/backend/issues/176)) ([72f52ef](https://github.com/Notifycal/backend/commit/72f52ef3ea07bad599d0dcaffa61038133eb5d1a))

## [0.2.1](https://github.com/Notifycal/backend/compare/v0.2.0...v0.2.1) (2025-01-03)


### Bug Fixes

* google oauth parameters are shared between multiple stacks ([#169](https://github.com/Notifycal/backend/issues/169)) ([b7538b3](https://github.com/Notifycal/backend/commit/b7538b36c15693ff345ae7ea4f7cdd686cc11828))

## [0.2.0](https://github.com/Notifycal/backend/compare/v0.1.2...v0.2.0) (2025-01-02)


### Features

* login and get user profile tf code. Openapi update + linting ([#120](https://github.com/Notifycal/backend/issues/120)) ([73deb99](https://github.com/Notifycal/backend/commit/73deb9969d0427129d1458bfd7c63611b57d8a36))
* refresh endpoint  ([#151](https://github.com/Notifycal/backend/issues/151)) ([48cfbdc](https://github.com/Notifycal/backend/commit/48cfbdc9ccf5b72fce6469611d79aec9c4b36683))


### Bug Fixes

* request payload consistency ([#167](https://github.com/Notifycal/backend/issues/167)) ([760a7bf](https://github.com/Notifycal/backend/commit/760a7bf087f8a8a52518eaa68e5035f784ec5d59))

## [0.1.2](https://github.com/Notifycal/backend/compare/v0.1.1...v0.1.2) (2024-12-25)


### Bug Fixes

* local login endpoint name ([#147](https://github.com/Notifycal/backend/issues/147)) ([afd0d8a](https://github.com/Notifycal/backend/commit/afd0d8a95a46125303e9fbf934db42cf565ebff7))

## [0.1.1](https://github.com/Notifycal/backend/compare/v0.1.0...v0.1.1) (2024-12-24)


### Bug Fixes

* make pre-plan-apply.sh script rely on parameter for stack version ([#145](https://github.com/Notifycal/backend/issues/145)) ([404b940](https://github.com/Notifycal/backend/commit/404b940dae7a75475520bc237b2ee9523aa17015))

## [0.1.0](https://github.com/Notifycal/backend/compare/v1.2.0...v0.1.0) (2024-12-24)


### Features

* add pre-plan-apply ci script ([#14](https://github.com/Notifycal/backend/issues/14)) ([e1c07e4](https://github.com/Notifycal/backend/commit/e1c07e4bbc86b8b7b4849b163ce046c57fc60566))
* AWS Powertools (Observability) ([#29](https://github.com/Notifycal/backend/issues/29)) ([9182ed6](https://github.com/Notifycal/backend/commit/9182ed6f4ec61c12a2a729e66861e52202860250))
* get user endpoint ([#143](https://github.com/Notifycal/backend/issues/143)) ([f47a645](https://github.com/Notifycal/backend/commit/f47a645b994b71d3bc5edf807fed67c80f4baa51))
* login endpoint. testing setup. first aws client.  ([#20](https://github.com/Notifycal/backend/issues/20)) ([cd619b7](https://github.com/Notifycal/backend/commit/cd619b741b5ea5b818b002379122318badc40610))
* Middleware to verify authorization. Improve request parsing middleware. ([#131](https://github.com/Notifycal/backend/issues/131)) ([f683c03](https://github.com/Notifycal/backend/commit/f683c0331931060b3d607d1f394e87cfefb4d887))
* setup API GW + Lambda in TF ([#1](https://github.com/Notifycal/backend/issues/1)) ([136101b](https://github.com/Notifycal/backend/commit/136101b63abfd9551513a6acb371df846213da6c))


### Bug Fixes

* always return JSON even on error (400, 500...) ([#132](https://github.com/Notifycal/backend/issues/132)) ([2109db6](https://github.com/Notifycal/backend/commit/2109db65e09f19fe202f0227e96f7cab871fd974))
* **ci:** attach build zip to release ([#7](https://github.com/Notifycal/backend/issues/7)) ([e976610](https://github.com/Notifycal/backend/commit/e976610425c8f6e23704d5e0f693d40102720b25))
* **ci:** attach right build zip to release ([#8](https://github.com/Notifycal/backend/issues/8)) ([eff933a](https://github.com/Notifycal/backend/commit/eff933aa7674333f0373ebba88592cf1511c00aa))
* comment out some fake env var value that never should have been … ([#130](https://github.com/Notifycal/backend/issues/130)) ([4fc0652](https://github.com/Notifycal/backend/commit/4fc065289b28a7f6667ee9b234877fa93eb4a8b8))
* replace var.resource_suffix with var.environment ([#26](https://github.com/Notifycal/backend/issues/26)) ([593ab72](https://github.com/Notifycal/backend/commit/593ab72955e41050a222b1a537005a50048ace16))
* use CommonJS modules instead of ESM as support is crap ([#24](https://github.com/Notifycal/backend/issues/24)) ([e81c066](https://github.com/Notifycal/backend/commit/e81c0669c10c09d83e32053be4b07885847cdc01))


### Miscellaneous Chores

* update gh repo for release-please action and restart semver ([97fb91a](https://github.com/Notifycal/backend/commit/97fb91a56e673d54c4b8f4456aae3ac0086af5d9))
