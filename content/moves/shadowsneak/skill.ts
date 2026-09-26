/**
 * 影子偷袭 / shadowsneak 的出手方式。
 *
 * 核心念头：本人不动，一道低矮的短影贴着地面朝提交的方向探出去，沿地形走到底、遇到实墙就停；
 *   它踩到**第一只**真实敌人的身体时，从那只敌人的背侧立起一刀，按 `sneak` 结算一次接触伤害。
 *   它不再抓取或减速，也不穿墙点人：追不到就是一条空影子缩回来。仍是全族最便宜、最快的先制起手。
 *
 * 两幕：
 *   起（windup，提交前）：脚下的影子加深、拉长，只播预告（present pool）；几乎不留前摇。
 *   探（execute）：提交后影子沿地面朝瞄准方向（或世界点方向）爬出去。前沿是一枚真实投射物，
 *       按 `seep` 的速度推进、遇墙或走满 `reach` 自然结束。第一个碰到其上的非友方实体被判定捕获，
 *       在其背侧立起一刀；无人踩到则影子在墙边或尽头塌回空处（fizzle）。目标关系与伤害许可仍由命中层判定。
 *
 * 与同族分开：暗影拳从对手自己的影子里升起一只拳、位置在正面、从不失手；影子偷袭从地面探出**第一只踩中的**敌人，
 *   从**背面**刺一刀，更轻、更快、更便宜，专做开局与打断；它不穿墙，也不再拉拽或减速。与音速拳的差别是：
 *   音速拳沿视线直线打，影子走地面、只认踩上来的那只。
 */
namespace PokemonSkills {
    define({
        id: shadowsneakId,
        cooldownParameter: "recharge",
        name: "Shadow Sneak",
        description: "本人不动，一道低矮的短影贴着地面朝瞄准方向探出去，遇到实墙就停；第一只被影子踩中的敌人，会从背侧挨一刀。它不追空、不穿墙，也不再拉拽或减速——全族最便宜、最快的先制起手。",
        uses: ["开局最便宜的一记先手，抢先打断对手", "沿地面探出短影，刺中第一只挡路的敌人", "隔着近处的地形边缘先发制人（遇到实墙就停）"],
        kind: "aim",
        range: 6.2,
        maxRange: 11.4,
        prepare: 3,
        active: 0,
        recover: 5,
        cooldown: 14,
        style: "shadow",
        defaults: { ai: { maxChase: 10, finish: true, preferBack: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p(shadowsneakId, "reach", pokemon) : 6.2) + 0.4, geometry: "line", style: "shadow", color: 0x7B4FD0,
                label: "影子偷袭" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[shadowsneakId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(shadowsneakId, "tempo", context)),
                recover: Math.round(p(shadowsneakId, "settle", context)),
                cooldown: Math.round(p(shadowsneakId, "recharge", context)),
                active: 0,
                range: p(shadowsneakId, "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("shadowsneak:pool", shadowsneakScene, 1, action.origin(),
                JSON.stringify({ moment: "pool", windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            const origin = self !== null ? self.position() : action.origin();
            const feet = self !== null ? WorldCombat.point(origin.x(), self.boundsMin().y() + 0.35, origin.z()) : origin;
            const aimed = aim(action);
            const heading = WorldGeometry.flatUnit(aimed, action.direction());
            const reach = Math.max(2, p(shadowsneakId, "reach", action));
            const seep = Math.max(0.6, p(shadowsneakId, "seep", action));
            const blade = Math.max(0.2, p(shadowsneakId, "blade", action));
            const shade = Math.max(10, Math.round(p(shadowsneakId, "shade", action)));
            const scenes = WorldFeedback.actionScenes(shadowsneakScene);

            // 已探路径止于第一块实心方块：影子沿地面走到这里就停，后面的人不再被算入。
            let tip = reach;
            const clip = world.clipBlocks(feet, feet.plus(heading.scale(reach)));
            if (clip !== null && clip.blocked()) {
                const wall = clip.blockPosition();
                if (wall !== null) tip = Math.max(1.0, Math.min(reach, wall.minus(feet).length()));
            }
            const end = feet.plus(heading.scale(tip));
            const travel = Math.max(2, Math.min(40, Math.round(tip / seep) + 2));
            const radius = Math.max(0.22, blade * 0.75);
            let resolved = false;

            function fizzle(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, shadowsneakScene, 1, at, { moment: "fizzle" }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.6, 0)), shadowsneakMissText, [], 20);
                scope.sound("minecraft:entity.vex.ambient", at, 10, "{}");
            }

            sound(action, "cobblemon:move.shadowball.actor");

            const flight = action.projectile(feet, heading.scale(seep), 0, radius, tip, travel + 20,
                function (inner: CombatAction, hit: CombatImpact): void {
                    if (resolved) return;
                    const scope = inner.world();
                    const victim = hit.target();
                    if (hit.hitEntity() && victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        resolved = true;
                        const vbody = scope.observe(victim);
                        const at = vbody !== null ? vbody.position() : hit.position();
                        // 背侧：沿影子前进方向越过受害者，从背后朝施法者方向立起。
                        const behind = at.plus(heading.scale(0.45 + blade));
                        const power = p(shadowsneakId, "sneak", inner);
                        const landed = hurt(inner, victim, shadowsneakId, power,
                            { damage: damageSpec(shadowsneakId, "sneak"), contact: true });
                        scenes.stop(inner);
                        if (landed) {
                            WorldFeedback.emit(scope, shadowsneakScene, 1, behind,
                                { moment: "stab", target: String(victim.ref()), blade: blade, shade: shade,
                                    power: Math.round(power * 10) / 10,
                                    direction: [-heading.x(), -heading.y(), -heading.z()] }, 26);
                            scope.sound("cobblemon:impact.ghost", at, 14, "{}");
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), shadowsneakHitText, [Math.round(power)], 22);
                        } else {
                            fizzle(inner, behind);
                        }
                        scenes.finish(inner, done);
                        return;
                    }
                    resolved = true;
                    const at = hit.blockPosition() !== null ? hit.blockPosition()! : hit.position();
                    scenes.stop(inner);
                    fizzle(inner, at);
                    scenes.finish(inner, done);
                },
                function (inner: CombatAction): void {
                    if (resolved) return;
                    resolved = true;
                    scenes.stop(inner);
                    fizzle(inner, inner.origin());
                    scenes.finish(inner, done);
                }, "{}");

            scenes.show(action, "crawl", feet,
                { moment: "crawl", projectile: flight, seep: seep, shade: shade, travel: travel,
                    direction: [heading.x(), heading.y(), heading.z()],
                    path: [[feet.x(), feet.y(), feet.z()], [end.x(), end.y(), end.z()]] });
        }
    });
}
