// 士气：一声龙吟鼓舞罩在友方身上的窗口，承载共享身份 world_combat:status/dragoncheer。
// 提高要害概率的行为写在本单元 skill.ts 的伤害元数据规则里（带身份者每次命中按自己 mark 的附加概率抬升）；
// 附加概率、光点数与是否龙属性另存在 world_combat:dragoncheer_mark 里。
// 与聚气互斥（原生同一份 volatile 不能并存）：已聚气的友方不会被鼓舞，由 skill.ts 的施放逻辑跳过。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:dragon_cheer")
    .beneficial()
    .color(0x63D6A4)
    .tag("world_combat:status/dragoncheer")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
