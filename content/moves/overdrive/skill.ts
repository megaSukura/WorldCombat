/**
 * 破音 / overdrive 的出手方式。
 *
 * 核心念头：这是一段朝正前方弹出去、带电的声浪乐句。施法者扎住脚，把乐器提到身前连拨三下，每一下都
 *   沿同一条走廊推出一道轰响的电声：走廊里的敌人各挨一次重击并被打退半步；电声可能把人震到麻痹。
 *   开余响时，三下之后还会有一记迟到的「巨大回声」回来，更重、也多一次麻痹机会——那是原生的回声意象。
 *
 * 三幕（可加一段余响）：
 *   起（windup，提交前）：把乐器提起、指尖聚电的预告；起手可被打断。
 *   拨（pluck × pulses → paralyze）：提交后按 interval 连拨三下，每下沿当前朝向扫过一条走廊，
 *       圈内每个敌人各挨一次 thrum、被沿走廊方向推退，并各掷一次麻痹。
 *   响（echo，仅配置开启）：隔 echoGap 刻回来一记更重的迟到声浪，再扫同一条走廊。
 *
 * 与同族分开：虫鸣是锥、刺耳声是只一下的细走廊、闪焰高歌是火锥；破音是**同一条直线走廊上连续数下的
 *   电声乐句**，唯一带电、唯一概率麻痹，且可多出一记迟到回声。
 *
 * 配置 `echo`（余响）由 resolve 改时序、由公式改每下威力与冷却：开启＝多一记迟到声浪、多一次麻痹机会。
 */
namespace PokemonSkills {
    const overdriveScene = "world_combat:move_overdrive";
    const overdriveHitText = "world_combat.move.overdrive.text.hit";
    const overdriveMissText = "world_combat.move.overdrive.text.miss";
    const overdriveParalyzeText = "world_combat.move.overdrive.text.paralyze";
    const overdrivePulses = 3;

    /** 把瞄准方向压到水平面；电声乐句沿地面朝正前方推出去。 */
    function overdriveHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 走廊四角顶点；判定（lane）与表现（path）读同一份形状。 */
    function overdriveLane(origin: CombatPoint, heading: CombatPoint, reach: number, half: number): number[][] {
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const nearA = origin.plus(side.scale(half)), nearB = origin.minus(side.scale(half));
        const far = origin.plus(heading.scale(reach));
        const farA = far.plus(side.scale(half)), farB = far.minus(side.scale(half));
        return [
            [nearA.x(), nearA.y() + 0.06, nearA.z()],
            [farA.x(), farA.y() + 0.06, farA.z()],
            [farB.x(), farB.y() + 0.06, farB.z()],
            [nearB.x(), nearB.y() + 0.06, nearB.z()]
        ];
    }

    define({
        id: "overdrive",
        name: "Overdrive",
        description: "扎住脚，把乐器提到身前朝正前方连拨三下：每一下都沿同一条走廊推出一道带电的轰响，走廊里的敌人各挨一次重击、被打退，并可能被震到麻痹。开余响时，三下之后还会回来一记更重的迟到声浪。",
        uses: ["沿一条直线连打三下、压住排成一列的敌人", "用带电声浪赌一次麻痹", "隔着掩体把走廊尽头的对手震退", "开余响啃一个硬目标"],
        kind: "enemy",
        range: 6.5,
        maxRange: 11,
        prepare: 9,
        active: 30,
        recover: 8,
        cooldown: 26,
        style: "riff",
        stationary: true,
        defaults: { echo: false, ai: { maxChase: 10, minFoes: 1 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("overdrive", "reach", pokemon), geometry: "line", style: "riff",
                color: 0xF2D24A, label: config && config.echo === true ? "破音·余响" : "破音·紧凑" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["overdrive"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("overdrive", "tempo", context)),
                recover: Math.round(p("overdrive", "settle", context)),
                cooldown: Math.round(p("overdrive", "recharge", context)),
                active: skills["overdrive"].active,
                range: p("overdrive", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("overdrive:charge", overdriveScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", echo: config && config.echo === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const echo = !!(config && config.echo);
            const interval = Math.max(3, Math.round(p("overdrive", "interval", action)));
            const reach = Math.max(4.0, p("overdrive", "reach", action));
            const width = Math.max(0.5, p("overdrive", "width", action));
            const power = p("overdrive", "thrum", action);
            const push = p("overdrive", "push", action);
            const chance = Math.max(0, Math.min(1, p("overdrive", "paralyzeChance", action)));
            const paralyzeTicks = Math.max(40, Math.round(p("overdrive", "paralyzeTicks", action)));
            const echoRatio = Math.max(0, p("overdrive", "echoRatio", action));
            const echoGap = Math.max(6, Math.round(p("overdrive", "echoGap", action)));
            const cap = Math.max(1, Math.round(p("overdrive", "maxTargets", action)));
            const arcs = Math.max(10, Math.round(14 + power * 0.3));
            const intensity = Math.max(0.6, Math.min(2.2, power / 32));
            let index = 0, hits = 0, paralyzed = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                try {
                    const scope = current.world(), body = scope.observe(action.actor());
                    if (body !== null) WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.5, 0)),
                        hits > 0 ? overdriveHitText : overdriveMissText, hits > 0 ? [hits] : [], 26);
                } catch (error) { /* the cancelled action already released its world handle */ }
                done(current);
            }

            /** 拨一下：沿当前朝向扫一条走廊，逐个结算并各掷一次麻痹。返回命中数。 */
            function lance(current: CombatAction, strength: number, moment: string): number {
                const scope = current.world();
                const body = scope.observe(action.actor());
                if (body === null) { finish(current); return 0; }
                current.stopMovement();
                const victim = action.target() !== null && scope.valid(action.target()!) ? action.target() : null;
                const victimBody = victim === null ? null : scope.observe(victim);
                const aimPoint = victimBody === null ? action.targetPosition() : victimBody.position();
                const from = body.position();
                const delta = aimPoint.minus(from);
                const heading = overdriveHeading(delta.length() < 0.01 ? action.direction() : delta);
                current.face(aimPoint, 30, 30);
                const path = overdriveLane(from, heading, reach, width);
                let struck = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.lane(from, heading, reach, width, { below: 2, above: 3 }), function (other) {
                    if (struck >= cap) return;
                    const landed = hurt(current, other, "overdrive", power * strength, { damage: damageSpec("overdrive", "thrum"), sound: true });
                    if (!landed) return;
                    struck++;
                    if (!scope.valid(other)) return;
                    scope.displace(other, heading.scale(push * strength));
                    if (chance > 0 && scope.random() < chance && CombatStatus.inflict(scope, other, "paralysis", paralyzeTicks)) {
                        paralyzed++;
                        const at = scope.observe(other);
                        if (at !== null) {
                            WorldFeedback.emit(scope, overdriveScene, 1, at.position(), { moment: "paralyze", target: String(other.ref()) }, 24);
                            WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.3, 0)), overdriveParalyzeText, [], 26);
                        }
                    }
                });
                hits += struck;
                WorldFeedback.emit(scope, overdriveScene, 1, from, {
                    moment: moment, target: victim === null ? "" : String(victim.ref()),
                    direction: [heading.x(), heading.y(), heading.z()], path: path, reach: reach, half: width,
                    index: index + 1, struck: struck, arcs: arcs, intensity: intensity, strength: strength
                }, moment === "echo" ? 30 : 26);
                return struck;
            }

            function echoWave(current: CombatAction): void {
                if (settled) return;
                lance(current, echoRatio, "echo");
                sound(current, "cobblemon:impact.electric");
                finish(current);
            }

            function pluck(current: CombatAction): void {
                if (settled) return;
                lance(current, 1, "pluck");
                index++;
                if (index >= overdrivePulses) {
                    if (echo && echoRatio > 0) current.after(echoGap, echoWave);
                    else { sound(current, "cobblemon:impact.electric"); finish(current); }
                    return;
                }
                current.after(interval, pluck);
            }

            sound(action, "minecraft:block.note_block.guitar");
            pluck(action);
        }
    });
}
