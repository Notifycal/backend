# Changelog

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
