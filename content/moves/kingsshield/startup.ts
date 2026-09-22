// 钢盾：摆出王者盾牌期间的身份，承载共享身份 world_combat:status/kingsshield。
// 按量吸收由共享 GuardEffects 的 pool 承担；接触削攻由本单元 skill.ts 在 pool 的 guarded 回调里结算。
// 与尖刺防守／碉堡不同，钢盾只挡伤害招式：变化招式会照常落下，所以这里没有提交点封口。
// 身份是「谁摆着钢盾」的读法、AI 的重复施放判据与图标来源。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:king_guard")
    .beneficial()
    .color(0xBFD3E6)
    .tag("world_combat:status/kingsshield")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
