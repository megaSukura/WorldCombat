/**
 * 冰锥的霜寒行为：把「被冰屑拖着」翻成实际减速。
 *
 * `world_combat:iciclespear_chill` 只借共享身份 `world_combat:status/chill`，行为全在这里写：
 *   按效果振幅（纯碎 0 档、霜附 1 档）周期性续一条对应等级的减速（`minecraft:slowness`）；
 *   振幅由 skill.ts 在每次命中时按配置写入并刷新时长，所以新锥会把减速维持在所选档位。
 * 效果自然到期、被牛奶或 /effect clear 清除时，减速也随之失续而结束。
 */
namespace PokemonSkills {
    WorldCombat.on("world_combat:move_iciclespear/chill", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== icicleSpearChill) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 8 !== 0) return;
        const effect = MobEffects.read(world, actor, icicleSpearChill);
        if (effect === null) return;
        world.marker(actor, "minecraft:slowness", 12, Math.min(2, effect.amplifier()));
    });
}
