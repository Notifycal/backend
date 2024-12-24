# Changelog

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
