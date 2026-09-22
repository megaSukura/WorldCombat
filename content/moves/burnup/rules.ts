/**
 * 燃尽 / burnup 的状态行为：把「不再是火属性」落到 NativeModifiers 的 types 层上。
 *
 * 效果 `world_combat:burnup_spent`（本单元 startup 注册，身份 world_combat:status/burned_out）挂上后，
 * 这里把它当时的属性去掉 fire 写进一条与效果同寿命的 types 层；效果结束（自然到期、牛奶、被清除、离场）
 * 时立刻解除这条层，属性随原生个体本身恢复。单火属性的个体去掉 fire 后没有可留的类型，
 * 退为 normal（原生不提供无属性表示，这是最接近的中性写法）。
 * 判定与表现都读同一份结果：`NativeEffects.types` 带层，于是本系加成、受击相性、AI 与 `ready` 一起变化。
 */
namespace PokemonSkills {
    /** 施法者 ref → 本单元为它挂的那条 types 层实例 id。 */
    var burnupSpentLayers: { [ref: string]: number } = Object.create(null);

    /** 去掉 fire 之后剩下的属性；一个都不剩时退为 normal。 */
    function burnupRemainingTypes(world: CombatWorld, actor: CombatActor): string[] {
        const pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(world, actor);
        const remaining = NativeEffects.types(pokemon, state).filter(function (type: string) { return type !== "fire"; });
        return remaining.length ? remaining : ["normal"];
    }

    WorldCombat.on("world_combat:move_burnup/spend", "world_combat:mob_effect_added", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== burnupSpentEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon") return;
        const key = String(actor.ref()), previous = burnupSpentLayers[key];
        if (previous) world.operation(previous, "world_combat:dispel", "{}");
        const ticks = Math.max(1, Math.round(Number(data.duration) || 200));
        burnupSpentLayers[key] = NativeModifiers.apply(world, actor, { types: burnupRemainingTypes(world, actor) }, ticks);
    });

    WorldCombat.on("world_combat:move_burnup/reignite", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== burnupSpentEffect) return;
        const world = event.world(), key = String(event.actor().ref()), layer = burnupSpentLayers[key];
        if (!layer) return;
        world.operation(layer, "world_combat:dispel", "{}");
        delete burnupSpentLayers[key];
        const body = world.observe(event.actor());
        if (body === null) return;
        WorldFeedback.emit(world, burnupScene, 1, body.position(), { moment: "reignite", target: key }, 38);
    });
}
