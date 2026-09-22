// 吐纳：一段可见的聚气窗口，承载共享身份 world_combat:status/focusenergy。
// 提高要害概率的行为写在本单元 skill.ts 的伤害元数据规则里（带身份者每次命中按已聚气的时间抬升附加概率）；
// 满气附加比例、深化时长与起始刻另存在 world_combat:focusenergy_mark 里。
// 与龙声鼓舞互斥（原生同一份 volatile 不能并存），由 skill.ts 的 ready 拒绝。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:focus_breath")
    .beneficial()
    .color(0x9FD8FF)
    .tag("world_combat:status/focusenergy")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
