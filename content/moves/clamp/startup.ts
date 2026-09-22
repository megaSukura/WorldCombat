// 贝壳夹击：两个身份。
// world_combat:clamped_shell —— 被夹住的一方，借共享身份 world_combat:status/partiallytrapped（原生 volatile），
//   行为（无法移动）由这里的移动归零与 skill.ts 的导航监听共同完成。
// world_combat:clamping     —— 施法者正在夹持，带自己的身份 world_combat:status/clamping；
//   skill.ts 的动作门禁据此阻止它开始新动作，实现「壳合着没法再出手」。
// 启动脚本不引用服务端共享库，标签用字符串字面量。
StartupEvents.registry("mob_effect", event => event.create("world_combat:clamped_shell")
    .harmful()
    .color(0x9FD7E8)
    .tag("world_combat:status/partiallytrapped")
    .tag("world_combat:status/identity_only")
    .modifyAttribute("minecraft:generic.movement_speed", "world_combat:clamped_shell_speed", -1, "add_multiplied_total")
    .modifyAttribute("minecraft:generic.flying_speed", "world_combat:clamped_shell_flying", -1, "add_multiplied_total")
    .effectTick((entity: any, amplifier: number) => { }));

StartupEvents.registry("mob_effect", event => event.create("world_combat:clamping")
    .harmful()
    .color(0x6FA9C0)
    .tag("world_combat:status/clamping")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
