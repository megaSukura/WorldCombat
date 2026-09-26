/**
 * 破音 / overdrive 的出手方式。
 *
 * 核心念头：这是一段朝瞄准方向弹出去、带电的声浪乐句。施法者扎住脚，把乐器提到身前连拨三下，
 *   每一下都从**当刻的身体位置**朝当刻的自由瞄准方向推出一道窄声路：路里的敌人各挨一次重击并被打退半步；
 *   电声可能把人震到麻痹。两下之间可以转准心，第一下锁定的目标不会被自动追着走。
 *   开余响时，第三拨之后动作就收束、可以继续走位，而第三拨那条声路会被托管留起：隔 `echoGap` 刻在**原位置**
 *   重放一记更重的迟到声浪（原 `echoRatio`），不跟新目标转头——那是原生的回声意象。
 *
 * 三幕（可加一段余响）：
 *   起（windup，提交前）：把乐器提起、指尖聚电的预告；起手可被打断。
 *   拨（pluck × 3 → paralyze）：提交后按 interval 连拨三下，每下沿当刻朝向扫过一条走廊，
 *       路里每个敌人各挨一次 thrum、被沿走廊方向推退，并各掷一次麻痹。
 *   响（echo，仅配置开启）：第三拨后动作结束；一条托管声路记下它的真实起终点与宽度，echoGap 后原地重放。
 *
 * 与同族分开：虫鸣是锥、刺耳声是只一下的细走廊、闪焰高歌是火锥；破音是**同一条直线走廊上连续数下的
 *   电声乐句**，唯一带电、唯一概率麻痹，且余响留在旧声路上而不是追着人跑。
 *
 * 配置 `echo`（余响）由 resolve 改时序、由公式改每下威力与冷却：开启＝多一记迟到声浪、多一次麻痹机会。
 */
namespace PokemonSkills {
    const overdriveScene = "world_combat:move_overdrive";
    const overdriveHitText = "world_combat.move.overdrive.text.hit";
    const overdriveMissText = "world_combat.move.overdrive.text.miss";
    const overdriveParalyzeText = "world_combat.move.overdrive.text.paralyze";
    const overdriveEcho = "world_combat:overdrive_echo";
    const overdrivePulses = 3;

    /** 把瞄准方向压到水平面；电声乐句沿地面朝瞄准方向推出去。 */
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

    /** 当刻自由瞄准：按住技能键时读控制点（逐拍可转向），AI 或未声明的输入回退到动作选点。 */
    function overdriveAim(action: CombatAction): CombatPoint {
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3)
                return WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]);
        } catch (error) { }
        try { return action.targetPosition(); } catch (error) { }
        return action.origin().plus(WorldCombat.point(0, 0, 1));
    }

    function overdriveEchoState(json: string): string {
        const value = JSON.parse(json);
        const finite = function (n: any): boolean { return typeof n === "number" && isFinite(n); };
        if (!Array.isArray(value.origin) || value.origin.length !== 3 || !value.origin.every(finite)) throw new Error("Invalid overdrive echo origin");
        if (!Array.isArray(value.heading) || value.heading.length !== 2 || !value.heading.every(finite)) throw new Error("Invalid overdrive echo heading");
        ["reach", "width", "power", "push", "chance", "paralyzeTicks", "cap", "arcs", "intensity", "strength", "gap"].forEach(function (key) {
            if (!finite(value[key])) throw new Error("Invalid overdrive echo state");
        });
        return JSON.stringify(value);
    }

    // 第三拨留下的托管声路：先按效果寿命亮起一条缓暗琴弦，echoGap 后在原位置重放一次，再随效果一起收掉。
    WorldCombat.effect(overdriveEcho, 1, 160, "actor", overdriveEchoState, EffectProtocols.unchanged);
    WorldCombat.effectHandler(overdriveEcho, "start", function (effect) {
        const data = JSON.parse(effect.state()), world = effect.world();
        const origin = WorldCombat.point(data.origin[0], data.origin[1], data.origin[2]);
        const heading = WorldCombat.point(data.heading[0], 0, data.heading[1]);
        WorldFeedback.onEffect(world, effect.id(), "overdrive:string", overdriveScene, 1, origin,
            { moment: "string", path: overdriveLane(origin, heading, data.reach, data.width),
                direction: [heading.x(), 0, heading.z()], reach: data.reach, half: data.width,
                arcs: data.arcs, intensity: data.intensity });
        effect.schedule("echo", "echo", Math.max(1, Math.round(data.gap)), "{}");
    });
    WorldCombat.effectHandler(overdriveEcho, "echo", function (effect) {
        const data = JSON.parse(effect.state()), world = effect.world();
        const origin = WorldCombat.point(data.origin[0], data.origin[1], data.origin[2]);
        const heading = WorldCombat.point(data.heading[0], 0, data.heading[1]);
        const path = overdriveLane(origin, heading, data.reach, data.width);
        let struck = 0;
        WorldGeometry.selectEnemies(world, WorldGeometry.lane(origin, heading, data.reach, data.width, { below: 2, above: 3 }), function (other) {
            if (struck >= data.cap) return;
            if (!hurt(world, other, "overdrive", data.power, { damage: damageSpec("overdrive", "thrum"), sound: true })) return;
            struck++;
            if (!world.valid(other)) return;
            world.hitDisplace(other, heading.scale(data.push * data.strength));
            if (data.chance > 0 && world.random() < data.chance && CombatStatus.inflict(world, other, "paralysis", data.paralyzeTicks)) {
                const at = world.observe(other);
                if (at !== null) {
                    WorldFeedback.emit(world, overdriveScene, 1, at.position(), { moment: "paralyze", target: String(other.ref()) }, 24);
                    WorldFeedback.text(world, at.position().plus(WorldCombat.point(0, 1.3, 0)), overdriveParalyzeText, [], 26);
                }
            }
        });
        WorldFeedback.emit(world, overdriveScene, 1, origin, {
            moment: "echo", path: path, direction: [heading.x(), 0, heading.z()],
            reach: data.reach, half: data.width, index: overdrivePulses, struck: struck,
            arcs: data.arcs, intensity: data.intensity, strength: data.strength
        }, 30);
        world.sound("cobblemon:impact.electric", origin, 16, "{}");
        effect.end();
    });
    WorldCombat.effectHandler(overdriveEcho, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: "overdrive",
        cooldownParameter: "recharge",
        name: "Overdrive",
        description: "扎住脚，把乐器提到身前朝瞄准方向连拨三下：每一下都从当下位置推出一道带电的轰响，两下之间可以转准心，路里的敌人各挨一次重击、被打退，并可能被震到麻痹。开余响时，三下之后动作收束，那一记更重的迟到声浪会在第三下的原位置重放，不追着人跑。",
        uses: ["沿一条直线连打三下、压住排成一列的敌人", "用带电声浪赌一次麻痹", "隔着掩体把走廊尽头的对手震退", "开余响封住敌人追来的那条通道"],
        kind: "aim",
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
            let index = 0, hits = 0, settled = false;

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

            /** 拨一下：沿当刻朝向扫一条走廊，逐个结算并各掷一次麻痹。返回命中数。 */
            function strike(current: CombatAction, from: CombatPoint, heading: CombatPoint, strength: number): number {
                const scope = current.world();
                let struck = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.lane(from, heading, reach, width, { below: 2, above: 3 }), function (other) {
                    if (struck >= cap) return;
                    const landed = hurt(current, other, "overdrive", power * strength, { damage: damageSpec("overdrive", "thrum"), sound: true });
                    if (!landed) return;
                    struck++;
                    if (!scope.valid(other)) return;
                    scope.hitDisplace(other, heading.scale(push * strength));
                    const at = scope.observe(other);
                    if (at !== null) WorldFeedback.emit(scope, overdriveScene, 1, at.position(),
                        { moment: "hit", target: String(other.ref()), arcs: arcs, intensity: intensity }, 20);
                    if (chance > 0 && scope.random() < chance && CombatStatus.inflict(scope, other, "paralysis", paralyzeTicks)) {
                        if (at !== null) {
                            WorldFeedback.emit(scope, overdriveScene, 1, at.position(), { moment: "paralyze", target: String(other.ref()) }, 24);
                            WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.3, 0)), overdriveParalyzeText, [], 26);
                        }
                    }
                });
                return struck;
            }

            function pluck(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const body = scope.observe(action.actor());
                if (body === null) { finish(current); return; }
                current.stopMovement();
                // 拨弦从当下身体位置出发、沿当刻自由瞄准锁定；不读取原 selected 目标，因此不会自动追人。
                const from = body.position();
                const aimed = overdriveAim(current);
                const delta = aimed.minus(from);
                const heading = overdriveHeading(delta.length() < 0.01 ? action.direction() : delta);
                current.face(from.plus(heading.scale(reach)), 90, 60);
                const path = overdriveLane(from, heading, reach, width);
                const struck = strike(current, from, heading, 1);
                hits += struck;
                index++;
                WorldFeedback.emit(scope, overdriveScene, 1, from, {
                    moment: "pluck", target: "", direction: [heading.x(), heading.y(), heading.z()], path: path,
                    reach: reach, half: width, index: index, struck: struck, arcs: arcs, intensity: intensity, strength: 1
                }, 26);
                if (index >= overdrivePulses) {
                    // 第三拨的真实起终点与宽度存成一条短托管声路；动作随即收束，echoGap 后原地重放。
                    if (echo && echoRatio > 0) {
                        current.effect(overdriveEcho, action.actor(), JSON.stringify({
                            origin: [from.x(), from.y(), from.z()], heading: [heading.x(), heading.z()],
                            reach: reach, width: width, power: power * echoRatio, push: push, chance: chance,
                            paralyzeTicks: paralyzeTicks, cap: cap, arcs: arcs, intensity: intensity,
                            strength: echoRatio, gap: echoGap
                        }), echoGap + 40);
                    }
                    sound(current, "cobblemon:impact.electric");
                    finish(current);
                    return;
                }
                current.after(interval, pluck);
            }

            sound(action, "minecraft:block.note_block.guitar");
            pluck(action);
        }
    });

    // 玩家按住技能键连拨三下、两下之间自由转向；AI 提交仍带一个目标点，读同一条控制输入。
    WorldCombat.preview("world_combat:overdrive", JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));
}
