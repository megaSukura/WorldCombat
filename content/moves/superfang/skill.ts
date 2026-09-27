/**
 * 愤怒门牙 / superfang 的出手方式。
 *
 * 核心念头：门牙先量住猎物的命脉，再一口咬掉它现有生命力的一半——不看力气，只砍掉剩下的。
 * 这是全族里唯一按比例结算的招：对满血厚目标最狠，越到残血越无力，所以它的位置在开场与破盾。
 *
 * 两幕：
 *   起（windup，提交前）：门牙并拢，在施法者与目标之间牵起一条量线，量线的读数与刻度就是目标当前生命。
 *   咬（pounce → bite / sever）：提交后沿直线扑出，咬中的一刻直接按目标当前生命的一半结算，
 *       命中处炸开骨白牙影与迸溅，浮字报的是这一口**实际削去**的生命；咬住 holdTicks 后松口收势。
 *
 * 与同族分开：咬碎研磨压塌护甲、必杀门牙钳住猛甩、贝壳刃横扫削甲；只有愤怒门牙削掉一半生命。
 */
namespace PokemonSkills {
    const superfangScene = "world_combat:move_superfang";
    const superfangSeverText = "world_combat.move.superfang.text.sever";
    const superfangMissText = "world_combat.move.superfang.text.miss";

    /** 用本次施放的配置与真正的目标求出这一口削去的伤害（与详情页读的是同一棵树）。 */
    function superfangDamage(action: CombatAction, config: any, victim: CombatActor): number {
        const world = action.world(), actor = action.actor();
        const context: NumberContext = { pokemon: CobblemonCombat.pokemon(actor), skill: skills["superfang"],
            detail: { values: config }, world: world, actor: actor, target: { world: world, actor: victim } };
        return Math.max(1, Math.round(p("superfang", "damage", context)));
    }

    define({
        freeMovement: true,
        id: "superfang",
        cooldownParameter: "recharge",
        name: "Super Fang",
        description: "门牙先量住猎物的命脉，再一口咬掉它现有生命的一半：不看攻防，按目标当前生命直接结算。对满血厚目标最狠，越残血越无力，是开场与破盾的招而不是收尾的招。",
        uses: ["一口削掉目标当前生命的一半", "开场就压掉厚血目标的血线", "用不看攻防的比例伤害破盾"],
        kind: "enemy",
        range: 1.9,
        maxRange: 3.4,
        prepare: 7,
        active: 40,
        recover: 8,
        cooldown: 34,
        style: "bite",
        defaults: { ai: { maxChase: 7, halfAt: 0.35 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p("superfang", "grip", pokemon) : 0.4) * 1.5, geometry: "line", style: "bite",
                color: 0xE8DCA0, label: "愤怒门牙" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["superfang"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(4, Math.round(p("superfang", "tempo", context))),
                recover: Math.max(3, Math.round(p("superfang", "aftercast", context))),
                cooldown: Math.max(20, Math.round(p("superfang", "recharge", context))),
                active: skills["superfang"].active,
                range: p("superfang", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:superfang:gather", superfangScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare }));
            const target = action.target();
            if (target !== null) {
                const body = action.sense().observe(target);
                const health = body === null ? 0 : body.health();
                const maximum = body === null || !(body.maxHealth() > 0) ? 1 : body.maxHealth();
                action.present("world_combat:superfang:measure", superfangScene, 1, action.origin(),
                    JSON.stringify({ moment: "measure", target: String(target.ref()),
                        path: [String(action.actor().ref()), String(target.ref())],
                        gap: Math.round(health), gauge: Math.max(3, Math.min(12, Math.round(health / maximum * 12))) }));
            }
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(superfangScene);
            const world = action.world();
            const direction = aim(action);
            const length = p("superfang", "reach", action);
            const step = p("superfang", "lunge", action);
            const radius = p("superfang", "grip", action);
            const hold = Math.max(1, Math.round(p("superfang", "holdTicks", action)));
            const scale = radius / 0.4;
            let travelled = 0, settled = false;

            movementScenes.show(action, "pounce", action.origin(), { moment: "pounce", direction: [direction.x(), direction.y(), direction.z()], scale: scale });
            sound(action, "minecraft:entity.fox.bite");

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, superfangScene, 1, at, { moment: "miss", scale: scale }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), superfangMissText, [], 20);
                sound(current, "minecraft:entity.player.attack.sweep");
                finish(current);
            }

            function latch(current: CombatAction, victim: CombatActor, at: CombatPoint): void {
                movementScenes.stop(current);
                const scope = current.world();
                const victimRef = String(victim.ref());
                const before = scope.observe(victim);
                const amount = superfangDamage(current, config, victim);
                const landed = superfangRawHit(current, victim, amount, true);
                if (!landed) {
                    // 原生拒绝（免疫／防护）：真实咬到但没有削血，只散一撮屑，不死冒牙闪、不报削血。
                    WorldFeedback.emit(scope, superfangScene, 1, at, { moment: "miss", scale: scale }, 20);
                    sound(current, "minecraft:entity.player.attack.sweep");
                    finish(current); return;
                }
                // 浮字与崩屑读这一口实际削去的生命，而不是公式里的拟伤害。
                const after = scope.valid(victim) ? scope.observe(victim) : null;
                const severed = Math.max(0, Math.round(((before ? before.health() : 0) - (after ? after.health() : 0)) * 10) / 10);
                WorldFeedback.emit(scope, superfangScene, 1, at,
                    { moment: "bite", morsels: Math.max(10, Math.min(90, Math.round(amount * 0.7))), scale: scale }, 24);
                sound(current, "cobblemon:move.superfang.target");
                WorldFeedback.emit(scope, superfangScene, 1, at,
                    { moment: "sever", severed: Math.round(severed),
                        shards: Math.max(12, Math.min(70, Math.round(severed * 1.2))), scale: scale,
                        intensity: Math.max(0.5, Math.min(2.2, severed / 18)) }, 28);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.25, 0)), superfangSeverText, [Math.round(severed)], 28);
                sound(current, "cobblemon:impact.normal");
                current.after(hold, function (next: CombatAction) { finish(next); });
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const remaining = length - travelled;
                const delta = direction.scale(Math.min(step, Math.max(0, remaining)));
                if (remaining <= 0.001) { whiff(current, origin); return; }
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) { latch(current, target, hit.position()); return; }
                    // 首体是友方或已离场：止步、不咬，也不盲目沿剩余向量继续推。
                    whiff(current, hit.position()); return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < p("superfang", "minimumMove", current) || travelled >= length) { whiff(current, origin); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
