/**
 * 毒千针 / barbbarrage 的出手方式。
 *
 * 念头的形状：抖身摆出针阵（aim）→ 一轮齐射把无数毒针扇形喷出（loose）→ 针雨各自飞行命中（barb）或在方块上扎住（stick）。
 * 整轮走完后再结算一次中毒：只要至少一针命中，就按概率在目标身上留下一份毒（venom）。
 * 一幕齐射做透：数量、张角、速度、中毒都由参数公式决定；目标已中毒时整轮翻倍。
 * 配置 hail（倾泻）改变针数与威力，走 resolve 把更长的收招与冷却算进去。
 */
namespace PokemonSkills {
    const barbbarrageScene = "world_combat:move_barbbarrage";
    const barbbarrageVenomText = "world_combat.move.barbbarrage.text.venom";
    const barbbarrageLooseText = "world_combat.move.barbbarrage.text.loose";

    /** 把瞄准方向绕 Y 轴旋转 angle 弧度；用于把针雨摊成一个扇面。 */
    function barbbarrageRotate(direction: CombatPoint, angle: number): CombatPoint {
        var cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);
    }

    define({
        id: "barbbarrage",
        name: "Barb Barrage",
        description: "The user launches countless toxic barbs to inflict damage. This may also poison the target. This move's power is doubled if the target is already poisoned.",
        uses: ["扇形压制的物理远程", "给一整片目标撒毒", "追击中毒的敌人"],
        kind: "enemy",
        range: 12,
        prepare: 5,
        active: 36,
        recover: 8,
        cooldown: 34,
        style: "barb",
        defaults: { hail: false, ai: { maxChase: 12, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["barbbarrage"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var hail = !!(config && config.hail);
            return {
                prepare: p("barbbarrage", "prepare", context),
                recover: p("barbbarrage", "recover", context) + (hail ? 2 : 0),
                cooldown: p("barbbarrage", "cooldown", context) + (hail ? 3 : 0)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_barbbarrage:aim", barbbarrageScene, 1, action.origin(), JSON.stringify({ moment: "aim" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const baseDirection = aim(action);
            const count = Math.max(1, Math.round(p("barbbarrage", "barbs", action)));
            const total = p("barbbarrage", "volley", action);
            const share = total / count;
            const speed = p("barbbarrage", "barbSpeed", action);
            const radius = p("barbbarrage", "barbRadius", action);
            const spread = p("barbbarrage", "spread", action) * Math.PI / 180;
            const range = action.range();
            const origin = action.origin();
            let remaining = count, hitAny = false;
            let venomTarget: any = null;
            WorldFeedback.emit(world, barbbarrageScene, 1, origin,
                { moment: "loose", count: count, scale: radius / 0.16, intensity: Math.max(0.5, Math.min(2, total / 60)) }, 22);
            WorldFeedback.text(world, origin, barbbarrageLooseText, [count], 24);
            sound(action, "minecraft:entity.arrow.shoot");
            function launch(index: number): void {
                const t = count === 1 ? 0 : index / (count - 1) - 0.5;
                const direction = barbbarrageRotate(baseDirection, t * spread);
                LivingActions.projectile(action, {
                    speed: speed, range: range, radius: radius, direction: direction,
                    appearance: { sprite: "cobblemon:particle/generic/spike", tint: 0x9BE86B, glow: true },
                    impact: function (current, hit) {
                        const body = current.world();
                        const target = hit.target();
                        if (target !== null && body.valid(target)) {
                            const force = Math.max(0.5, Math.min(2, total / 60));
                            const landed = impact(current, hit, "barbbarrage", share, { damage: damageSpec("barbbarrage", "volley"), knockback: false });
                            if (landed) { hitAny = true; venomTarget = target; }
                            body.displace(target, baseDirection.scale(p("barbbarrage", "push", current)));
                            WorldFeedback.emit(body, barbbarrageScene, 1, hit.position(),
                                { moment: "barb", target: String(target.ref()), intensity: force, prick: Math.round(6 * force) }, 18);
                        } else {
                            WorldFeedback.emit(body, barbbarrageScene, 1, hit.position(), { moment: "stick" }, 16);
                        }
                    }
                }, function (current) {
                    remaining--;
                    if (remaining > 0) return;
                    const body = current.world();
                    if (hitAny && venomTarget !== null && body.valid(venomTarget) && world.random() < p("barbbarrage", "poisonChance", current)) {
                        CombatStatus.inflict(body, venomTarget, "poison", p("barbbarrage", "venomTicks", current), 0, { secondary: true });
                        const wound = body.observe(venomTarget);
                        if (wound !== null) WorldFeedback.text(body, wound.position(), barbbarrageVenomText, [], 28);
                        WorldFeedback.emit(body, barbbarrageScene, 1, wound !== null ? wound.position() : origin, { moment: "venom" }, 22);
                    }
                    done(current);
                });
            }
            for (var index = 0; index < count; index++) launch(index);
        }
    });
}
