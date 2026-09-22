// 藤甲：撑起尖刺防守期间的身份，承载共享身份 world_combat:status/spikyshield。
// 按量吸收由共享 GuardEffects 的 pool 承担；接触穿刺由本单元 skill.ts 在 pool 的 guarded 回调里结算；
// 变化招式的封口由提交点监听承担。身份是「谁顶着藤甲」的读法、封口与 AI 重复施放的判据。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:spiky_guard")
    .beneficial()
    .color(0x6FBF4A)
    .tag("world_combat:status/spikyshield")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
