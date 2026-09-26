// 光墙的共享身份载体：一个真实有益 MobEffect，对任何活体是同一个身份 world_combat:status/lightscreen。
// 幕面本身是带 screen 标签的 world_combat:field 场地，位置固定；这个载体由场地按 field.id 贡献给施法者，
// 削减与滤淡写在 skill.ts 的入场伤害规则，按实际交面判断，而不是给半径内所有人无条件减伤。
// 载体可被破屏招（按 world_combat:category/screen 标签）清除；被牛奶／/effect clear 清掉后，场地在下一次扫描收场。
StartupEvents.registry("mob_effect", event => event.create("world_combat:lightscreen_veil")
    .beneficial()
    .tag("world_combat:category/screen")
    .color(0xFFE9A8)
    .tag("world_combat:status/lightscreen")
    .tag("world_combat:status/identity_only")
    .effectTick((entity: any, amplifier: number) => { }));
