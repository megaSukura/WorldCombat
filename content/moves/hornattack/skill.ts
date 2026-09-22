/**
 * 角撞 / hornattack 的出手方式。
 *
 * 核心念头：**低头扎进对手、把角锁在伤口上，用整个身体把对方沿地面一路顶出去**——不是一记击退，
 * 而是一段持续的地面推移，把目标从站位上推走。它是本组唯一的「顶住推走」。
 *
 * 三幕：
 *   起（brace，提交前）：低头、后腿蹬地、角尖压低，只播预告。
 *   顶（gore → impact，提交后）：朝前趟进 `rush` 格，沿身前 `reach` 格长、`horn` 半宽的窄线取第一个非友方
 *       结算 `gore` 接触伤害，并按 `shove` 把它顶开一记。
 *   推（push，可续几刻）：角不松，把目标沿地面以 `carrySpeed` 每刻前推，总共推走 `carry` 格；
 *       撞到墙或推到距离尽头就松角。施法者跟着一起前移，推完才收势。
 *
 * 与同族分开：超级角击是长蓄势、单点窄线的重刺（会钉住或挑飞）；头锤扑上去撞出畏缩；撞击从身侧滑过换位；
 * 角撞凭「锁住、贴着地面把目标一路推走」认出来。
 *
 * 配置 `drive` 由公式改威力、顶走距离与初始顶退，由 resolve 改时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const hornattackScene = "world_combat:move_hornattack";
    const hornattackHitText = "world_combat.move.hornattack.text.hit";
    const hornattackPushText = "world_combat.move.hornattack.text.push";
    const hornattackMissText = "world_combat.move.hornattack.text.miss";
    const hornattackMinimum = 0.02;

    /** 把瞄准方向压平成一个水平单位向量。 */
    function hornattackHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 角线判定与画面共用的四个顶点：从身体高度沿方向铺 `reach` 格、半宽 `half` 的窄带。 */
    function hornattackLane(origin: CombatPoint, heading: CombatPoint, reach: number, half: number): number[][] {
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const near = origin.plus(WorldCombat.point(0, -0.05, 0));
        const far = near.plus(heading.scale(reach));
        const a = near.plus(side.scale(half)), b = near.minus(side.scale(half));
        const c = far.minus(side.scale(half)), d = far.plus(side.scale(half));
        return [[a.x(), a.y(), a.z()], [b.x(), b.y(), b.z()], [c.x(), c.y(), c.z()], [d.x(), d.y(), d.z()]];
    }

    define({
        id: "hornattack",
        name: "Horn Attack",
        description: "The target is jabbed with a sharply pointed horn to inflict damage.",
        uses: ["低头一记角撞并顶开贴身目标", "把对手沿地面一路推离掩体或站位", "低消耗的近身压制"],
        kind: "enemy",
        range: 1.9,
        maxRange: 2.8,
        prepare: 7,
        active: 20,
        recover: 7,
        cooldown: 16,
        maximumTicks: 220,
        style: "stab",
        defaults: { drive: false, ai: { maxChase: 6, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("hornattack", "reach", pokemon), geometry: "line", style: "stab", color: 0xC9A06A,
                label: config && config.drive === true ? "推土式" : "角撞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["hornattack"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("hornattack", "tempo", context)),
                recover: Math.round(p("hornattack", "aftercast", context)),
                cooldown: Math.round(p("hornattack", "recharge", context)),
                active: skills["hornattack"].active,
                range: p("hornattack", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_hornattack:brace", hornattackScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", windup: prepare, drive: config && config.drive === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const heading = hornattackHeading(aim(action));
            const reach = Math.max(1.5, p("hornattack", "reach", action));
            const horn = Math.max(0.26, p("hornattack", "horn", action));
            const rush = Math.max(0, p("hornattack", "rush", action));
            const shove = Math.max(0, p("hornattack", "shove", action));
            const carry = Math.max(0, p("hornattack", "carry", action));
            const carrySpeed = Math.max(0.05, p("hornattack", "carrySpeed", action));
            const power = p("hornattack", "gore", action);
            const dust = Math.max(8, Math.round(p("hornattack", "dust", action)));
            const scale = Math.max(0.6, Math.min(1.8, horn / 0.34));
            const intensity = Math.max(0.6, Math.min(2.0, power / 62));
            const direction = [heading.x(), heading.y(), heading.z()];

            const self = world.observe(actor);
            if (self !== null && rush > 0.05) {
                const target = action.target();
                const body = target !== null && world.valid(target) ? world.observe(target) : null;
                const delta = body !== null ? body.position().minus(self.position()) : heading.scale(rush);
                const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                const advance = Math.min(rush, Math.max(0, flat - reach * 0.6));
                if (advance > 0.02) world.displace(actor, heading.scale(advance));
            }
            const moved = world.observe(actor);
            const origin = moved === null ? action.origin() : moved.position();

            sound(action, "minecraft:entity.hoglin.angry");
            WorldFeedback.emit(world, hornattackScene, 1, origin,
                { moment: "gore", path: hornattackLane(origin, heading, reach, horn), direction: direction,
                    reach: reach, dust: dust, scale: scale, intensity: intensity }, 18);

            const found: CombatActor[] = [];
            WorldGeometry.selectEnemies(world, WorldGeometry.lane(origin, heading, reach, horn, { below: 1.0, above: 1.6 }),
                function (candidate) { if (found.length === 0) found.push(candidate); });
            if (found.length === 0) {
                WorldFeedback.emit(world, hornattackScene, 1, origin.plus(heading.scale(reach * 0.9)),
                    { moment: "miss", dust: Math.round(dust * 0.6), scale: scale }, 18);
                WorldFeedback.text(world, origin.plus(heading.scale(reach * 0.9)).plus(WorldCombat.point(0, 1.0, 0)), hornattackMissText, [], 20);
                done(action);
                return;
            }

            const victim = found[0];
            const foe = world.observe(victim);
            if (foe === null) { done(action); return; }
            if (!hurt(action, victim, "hornattack", power, { damage: damageSpec("hornattack", "gore"), contact: true })) { done(action); return; }
            sound(action, "cobblemon:impact.normal");
            WorldFeedback.emit(world, hornattackScene, 1, foe.position(),
                { moment: "impact", target: String(victim.ref()), dust: dust, scale: scale, intensity: intensity }, 20);
            WorldFeedback.text(world, foe.position().plus(WorldCombat.point(0, 1.1, 0)), hornattackHitText, [], 20);
            if (shove > 0.02 && world.valid(victim)) world.displace(victim, heading.scale(shove));

            let carried = shove, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(actor);
                const at = body === null ? origin : body.position();
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), hornattackPushText, [Math.round(carried * 10) / 10], 24);
                done(current);
            }

            function push(current: CombatAction, remaining: number): void {
                const scope = current.world();
                if (!scope.valid(victim) || remaining <= 0.02) { finish(current); return; }
                const step = Math.min(carrySpeed, remaining);
                const back = heading.scale(step);
                const targetMoved = scope.displace(victim, back);
                if (scope.valid(actor)) scope.displace(actor, back);
                carried += targetMoved;
                const body = scope.observe(victim);
                if (body !== null)
                    WorldFeedback.emit(scope, hornattackScene, 1, body.position(),
                        { moment: "push", target: String(victim.ref()), dust: Math.round(dust * 0.7), scale: scale, intensity: intensity }, 12);
                if (targetMoved < hornattackMinimum || carried >= carry) { finish(current); return; }
                current.after(1, function (next: CombatAction) { push(next, remaining - step); });
            }

            push(action, carry);
        }
    });
}
