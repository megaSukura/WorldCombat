/**
 * 龙之俯冲 / dragonrush 的出手方式。
 *
 * 核心念头：先把杀气铺成一圈可见的威压把人镇住，再从高处沿一条弧线俯冲砸在锁定点上；被杀气罩住、
 *   被速度差镇住的目标，更容易被这一撞撞懵。起手那圈威压就是这招的身份：对手从画面就知道它要往哪落。
 *
 * 三幕：
 *   起（windup，提交前）：杀气在身周铺开成圈，地面被压出纹路；`menace`（威压半径）越大铺得越开。
 *   扑（execute，提交后）：朝锁定的落点腾起再下坠，一个来回；落点在起跳时锁定，对手在滞空期走开就能躲过。
 *   落（impact / miss，可带多个 stagger）：砸地掷一次 `accuracy`；命中则落点半径内所有非友方各吃一记 `dive`
 *       接触伤害、被顶开 `push` 格，并按 `flinchChance` 掷一次畏缩；砸偏则只在落点扬尘。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 *
 * 与同族分开：泰山压顶是原地坐压、靠体重压麻；龙之俯冲先亮杀气再前扑；疯狂滚压贴地滚过一排、不腾空。
 */
namespace PokemonSkills {
    function dragonrushFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, dragonrushFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        freeMovement: true,
        id: dragonrushId,
        cooldownParameter: "recharge",
        name: "Dragon Rush",
        description: "先在身周铺开一圈可见的杀气，再从高处沿弧线俯冲砸在锁定点上：落点附近的敌人一起被撞开，扑得比对手越快、越容易把它撞得畏缩。落点在起跳时锁定，对手在滞空期走开就能躲过。",
        uses: ["先亮一圈威压、再前扑砸在锁定点上", "把落点周围的敌人一起撞开", "用速度差把对手镇得无法出手"],
        kind: "enemy",
        range: 5.0,
        maxRange: 8.0,
        prepare: 10,
        active: 0,
        recover: 12,
        cooldown: 38,
        style: "dive",
        defaults: { dread: false, ai: { maxChase: 10 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(dragonrushId, "menace", pokemon), geometry: "area", style: "dive", color: 0x7C6BE8,
                label: config && config.dread === true ? "威压·龙之俯冲" : "龙之俯冲" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[dragonrushId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(dragonrushId, "tempo", context)),
                recover: Math.round(p(dragonrushId, "recover", context)),
                cooldown: Math.round(p(dragonrushId, "recharge", context)),
                active: 0,
                range: p(dragonrushId, "menace", context) + 2.2
            };
        },
        windup: function (action, config, prepare) {
            action.present("dragonrush:menace", dragonrushScene, 1, action.origin(),
                JSON.stringify({ moment: "menace", menace: p(dragonrushId, "menace", action), windup: prepare,
                    dread: config && config.dread === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const landing = action.targetPosition();
            const power = p(dragonrushId, "dive", action);
            const accuracy = p(dragonrushId, "accuracy", action);
            const radius = p(dragonrushId, "landRadius", action);
            const chance = p(dragonrushId, "flinchChance", action);
            const flinchTicks = Math.round(p(dragonrushId, "flinchTicks", action));
            const push = p(dragonrushId, "push", action);
            const hop = p(dragonrushId, "hop", action);
            const air = Math.max(6, Math.round(p(dragonrushId, "airTicks", action)));
            const dust = Math.max(10, Math.round(p(dragonrushId, "dust", action)));
            const scale = Math.max(0.7, Math.min(2.2, radius / 2.0));
            const intensity = Math.max(0.6, Math.min(2.3, power / 80));
            const delta = landing.minus(origin);
            const flat = WorldCombat.point(delta.x(), 0, delta.z());
            const heading = flat.length() < 1e-6 ? aim(action) : flat.unit();
            const approach = Math.max(0, Math.min(flat.length() - 0.3, action.range()));
            const rise = Math.max(2, Math.floor(air / 2));
            const fall = Math.max(2, air - rise);
            const horizontal = approach / air;
            const up = hop / rise;
            const down = hop / fall;

            WorldFeedback.emit(world, dragonrushScene, 1, origin, { moment: "leap", scale: scale, hop: hop, dust: dust }, 22);
            sound(action, "minecraft:entity.ender_dragon.flap");

            function land(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                const at = body === null ? landing : body.position();
                const hit = scope.random() < accuracy;
                let hits = 0;
                WorldFeedback.emit(scope, dragonrushScene, 1, at,
                    { moment: hit ? "crash" : "miss", scale: scale, dust: dust, intensity: intensity }, 32);
                sound(current, hit ? "cobblemon:impact.dragon" : "minecraft:item.mace.smash_air");
                if (hit) {
                    WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, radius, { below: 2.5, above: 3 }),
                        function (target, facts) {
                            const landed = hurt(current, target, dragonrushId, power,
                                { damage: damageSpec(dragonrushId, "dive"), contact: true });
                            hits++;
                            if (!landed) return;
                            const away = facts.position().minus(at);
                            if (scope.valid(target) && away.length() >= 0.05) scope.displace(target, away.unit().scale(push));
                            WorldFeedback.emit(scope, dragonrushScene, 1, facts.position(),
                                { moment: "impact", target: String(target.ref()), dust: dust, intensity: intensity }, 26);
                            if (scope.random() < chance && dragonrushFlinch(scope, target, flinchTicks)) {
                                WorldFeedback.emit(scope, dragonrushScene, 1, facts.position(),
                                    { moment: "stagger", target: String(target.ref()) }, 24);
                                WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.4, 0)), dragonrushFlinchText, [], 24);
                            }
                        });
                }
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.5, 0)),
                    hits > 0 ? dragonrushHitText : dragonrushMissText, hits > 0 ? [hits] : [], 28);
                done(current);
            }

            function descend(current: CombatAction, elapsed: number): void {
                if (elapsed >= fall) { land(current); return; }
                current.world().displace(current.actor(), heading.scale(horizontal).plus(WorldCombat.point(0, -down, 0)));
                current.after(1, function (next: CombatAction) { descend(next, elapsed + 1); });
            }
            function ascend(current: CombatAction, elapsed: number): void {
                if (elapsed >= rise) { descend(current, 0); return; }
                current.world().displace(current.actor(), heading.scale(horizontal).plus(WorldCombat.point(0, up, 0)));
                current.after(1, function (next: CombatAction) { ascend(next, elapsed + 1); });
            }
            ascend(action, 0);
        }
    });

}
