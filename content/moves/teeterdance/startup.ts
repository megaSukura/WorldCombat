// 摇晃舞的恍惚载体：一个真实有害 MobEffect，对任何活体借共享身份 world_combat:status/confusion。
// 它与别的混乱载体共享身份但不共享行为：摇晃走位与失手写在本单元 skill.ts，消费方按身份读取，
// 生产方是谁都不影响；本单元只接管 id 为自己这个载体的行为。
StartupEvents.registry("mob_effect", event => event.create("world_combat:teeterdance_spin")
    .harmful()
    .color(0xB15CE0)
    .tag("world_combat:status/confusion")
    .tag("world_combat:status/identity_only")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
