// 摇晃舞的恍惚载体：一个真实有害 MobEffect，对任何活体借共享身份 world_combat:status/confusion。
// 它不声明 identity_only：共享 CombatStatus 的失手门禁因此同时覆盖脚本招式与原生攻击，本单元不再自己掷骰。
// 摇晃走位这类独有行为写在本单元 skill.ts，消费方按身份读取，生产方是谁都不影响。
StartupEvents.registry("mob_effect", event => event.create("world_combat:teeterdance_spin")
    .harmful()
    .color(0xB15CE0)
    .tag("world_combat:status/confusion")
    // 非空回调让原生效果时钟保持运行。
    .effectTick((entity: any, amplifier: number) => { }));
