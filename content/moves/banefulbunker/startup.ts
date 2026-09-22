// 毒壁：合拢碉堡期间的身份，承载共享身份 world_combat:status/banefulbunker。
// 按量吸收由共享 GuardEffects 的 pool 承担；接触中毒由本单元 skill.ts 在 pool 的 guarded 回调里走
// CombatStatus.inflict（共享主异常“poison”，宝可梦那侧由共享库同步成原生异常）；变化招式的封口由提交点监听承担。
// 身份是「谁缩在碉堡里」的读法、封口与 AI 的重复施放判据。启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:baneful_guard")
    .beneficial()
    .color(0x9B59B6)
    .tag("world_combat:status/banefulbunker")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
