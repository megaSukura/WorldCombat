/**
 * 诡异咒语 / eeryspell —— 启动注册：真实 MobEffect「诡异」。
 *
 * 它带共享身份 `world_combat:status/eerie` 与 `identity_only`：只借身份、行为由本单元写
 * （每次尝试提交动作时按效果等级掷一次失手，见 skill.ts 的动作策略）。宝可梦不会被自动镜像成
 * 原生异常——本招对宝可梦的那一层是单独的 PP 抽取。
 */
StartupEvents.registry("mob_effect", event => event.create("world_combat:eerie")
    .harmful()
    .color(0x7A4FBF)
    .tag("world_combat:status/eerie")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
