/**
 * 巨力锤 / gigatonhammer —— 出手方式。
 *
 * 核心念头：连人带锤旋身蓄力，再把巨锤高高抡下砸在身前地面；锤落先砸中近圈一次，再沿地面掀起一道冲击波向前
 *   推进——冲击波按距离分三段依序前移，每段只结算走到的那一截，同一个目标本招只吃主锤或震波中的一份判定。
 *   砸完身体被惯性拖住：收招很长，而且短时间内无法再抡起巨锤（原生「无法连续使出2次」）。
 *
 * 幕：
 *   起（wind，提交前）：旋身把巨锤抡高，脚边碎屑与钢光散开（`action.present`，可打断、不花 PP）。
 *   砸（slam，提交后）：巨锤落在身前 `reach` 格的地面，近圈内的非友方各结算一次 `hammer`，被顶开 `push` 格。
 *   波（wave）：冲击波沿地面向前推进 `shockLength` 格、宽 `shockHalfWidth`；分三段按真实时刻依次前移，每段内的
 *       非友方（尚未吃过主锤的）结算 `wave` 并被顶开。横扫式下改成绕身一圈，圈内各吃 `hammer`。
 *   收（mark/spent）：落点留下痕印，施法者进入禁复窗口（`eligibility` 门禁实现），身上留下标识。
 *
 * 选取 `kind: "aim"`：可指任意阵营实体、方向或地面点；空砸也照样震地、冲出冲击波。高空的目标不在贴地波段内，
 *   吃不到地波。攻击许可仍由命中层决定，AI 仍按仇恨推荐敌人。
 *
 * 与同族分开：木槌/冰锤是自伤/减速的单点重击、臂锤是减速横扫；只有巨力锤是**旋身蓄力后沿地面分三段推进的
 *   钢属性落锤**。
 */
namespace PokemonSkills {
    /** 落锤走廊的四个角：from 起、朝 direction 长 length、半宽 half；判定与表现共用同一组顶点。 */
    function gigatonhammerLane(from: CombatPoint, direction: CombatPoint, length: number, half: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = from.plus(heading.scale(length));
        return [from.plus(side.scale(half)), from.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    /** 禁复标识的托管效果：跟着施法者，窗口结束或被换招提前恢复时一起收走。 */
    const gigatonhammerSpentMark = "world_combat:gigatonhammer_spent";

    WorldCombat.effect(gigatonhammerSpentMark, 1, 400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.ticks !== "number" || !isFinite(value.ticks) || value.ticks <= 0) throw new Error("Invalid gigatonhammer spent: ticks");
        return JSON.stringify({ ticks: Math.round(value.ticks) });
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(gigatonhammerSpentMark, "start", function (effect) { effect.schedule("watch", "watch", 1, "{}"); });
    WorldCombat.effectHandler(gigatonhammerSpentMark, "watch", function (effect) {
        const state = JSON.parse(effect.state()), world = effect.world(), actor = effect.target();
        if (!world.valid(actor)) { effect.end(); return; }
        const native = NativeEffects.read(world, actor);
        const spent = String(native.used) === gigatonhammerId && world.tick() - native.usedTick < state.ticks;
        // 换成别的招式或窗口走完，巨锤已能重新举起，标识随实际过程收走。
        if (!spent) { effect.end(); return; }
        effect.schedule("watch", "watch", 2, "{}");
    });
    WorldCombat.effectHandler(gigatonhammerSpentMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 禁复门禁：最近一次提交的就是本招、且还在 `spent` 窗口内时，本招不可用。
     *  只作用于起手/提交；本次施放命中时的伤害阶段不再复查，否则刚提交的这一下会被自己顶回去。 */
    function gigatonhammerSpent(context: CombatStatus.ActionPolicy): void {
        if (context.phase === "damage") return;
        if (String(context.actor.domain()) !== "cobblemon" || !context.world.valid(context.actor)) return;
        const state = NativeEffects.read(context.world, context.actor);
        if (String(state.used) !== gigatonhammerId) return;
        const pokemon = CobblemonCombat.pokemon(context.actor);
        const ticks = Math.max(1, Math.round(p(gigatonhammerId, "spent", { pokemon: pokemon, skill: skills[gigatonhammerId],
            detail: { values: skills[gigatonhammerId].defaults }, world: context.world, actor: context.actor })));
        if (context.world.tick() - state.usedTick < ticks) context.blocked["move-restricted"] = true;
    }

    define({
        id: gigatonhammerId,
        cooldownParameter: "recharge",
        name: "Gigaton Hammer",
        description: "连人带锤旋身蓄力，再把巨锤高高抡下砸在身前地面；锤落先砸中近圈一次，再沿地面掀起一道向前推进的冲击波——冲击波按距离分三段依序前移，同一个目标只吃主锤或震波中的一份。砸完收招很长，短时间内无法再抡起巨锤——换成别的招式可以提前恢复。横扫式让巨锤扫过一圈，代价是威力与节奏。",
        uses: ["旋身蓄力后把巨锤抡下", "用分三段推进的地面冲击波清掉一条走廊", "被围时用横扫式扫过一圈"],
        kind: "aim",
        range: 3.2,
        maxRange: 4.6,
        prepare: 12,
        active: 0,
        recover: 18,
        cooldown: 46,
        style: "hammer",
        defaults: { sweep: false, ai: { maxChase: 7, minHealth: 0.2, crowd: false } },
        fields: [],
        eligibility: gigatonhammerSpent,
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[gigatonhammerId], detail: { values: config } };
            return {
                radius: p(gigatonhammerId, "reach", context), geometry: "line", style: "hammer", color: 0xB9C2CC,
                label: config && config.sweep === true ? "巨力锤·横扫" : "巨力锤·过顶"
            };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[gigatonhammerId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(gigatonhammerId, "spin", context)),
                recover: Math.round(p(gigatonhammerId, "recover", context)),
                cooldown: Math.round(p(gigatonhammerId, "recharge", context)),
                active: 0,
                range: p(gigatonhammerId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const dust = Math.max(10, Math.round(p(gigatonhammerId, "dust", action)));
            action.present("gigatonhammer:wind:" + action.id(), gigatonhammerScene, 1, action.origin(),
                JSON.stringify({ moment: "wind", windup: prepare, dust: dust,
                    sweep: config && config.sweep === true ? 1 : 0, radius: p(gigatonhammerId, "shockLength", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(gigatonhammerScene);
            const world = action.world();
            const actor = action.actor();
            const sweep = !!(config && config.sweep);
            const hammer = p(gigatonhammerId, "hammer", action);
            const wave = p(gigatonhammerId, "wave", action);
            const reach = Math.max(2, action.range());
            const shockLength = Math.max(2, p(gigatonhammerId, "shockLength", action));
            const halfWidth = p(gigatonhammerId, "shockHalfWidth", action);
            const push = p(gigatonhammerId, "push", action);
            const dust = Math.max(12, Math.round(p(gigatonhammerId, "dust", action)));
            const shockSpeed = Math.max(0.3, p(gigatonhammerId, "shockSpeed", action));
            const spentTicks = Math.max(1, Math.round(p(gigatonhammerId, "spent", action)));
            const self = world.observe(actor);
            if (self === null) { scenes.finish(action, done); return; }
            const origin = self.position();
            let heading = action.targetPosition().minus(origin);
            if (heading.length() < 0.05) heading = action.direction();
            const flat = WorldCombat.point(heading.x(), 0, heading.z());
            const direction = flat.length() < 0.001 ? WorldCombat.point(0, 0, 1) : flat.unit();
            const ground = origin.plus(direction.scale(Math.min(reach, Math.max(0.5, heading.length()))));
            const scale = Math.max(0.5, Math.min(2.4, shockLength / 4.8));
            const intensity = Math.max(0.6, Math.min(2.6, hammer / 160));
            const struck: { [ref: string]: boolean } = Object.create(null);
            let waveHits = 0, settled = false;

            function displaceBack(scope: CombatWorld, victim: CombatActor, away: CombatPoint): void {
                if (scope.valid(victim) && away.length() > 0.01) scope.displace(victim, away.unit().scale(push));
            }

            /** 收尾：落痕、结算文字、禁复标识，然后结束动作。 */
            function settle(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.emit(scope, gigatonhammerScene, 1, ground,
                    { moment: "mark", dust: dust, shockLength: shockLength, halfWidth: halfWidth, scale: scale,
                        intensity: intensity, sweep: sweep ? 1 : 0 }, 30);
                WorldFeedback.text(scope, ground.plus(WorldCombat.point(0, 1.0, 0)), gigatonhammerSlamText,
                    [Math.round(hammer), waveHits], 28);
                scope.sound("minecraft:block.anvil.land", ground, 16, "{}");
                scope.sound("cobblemon:impact.steel", ground, 14, "{}");
                // 禁复标识绑在实际窗口上：换招提前恢复或窗口走完，标识一起收走。
                scope.effects(actor, gigatonhammerSpentMark).forEach(function (view) { scope.operation(view.id(), "world_combat:dispel", "{}"); });
                const rest = scope.observe(actor);
                const centre = rest === null ? origin : rest.position();
                const mark = scope.effect(gigatonhammerSpentMark, actor, JSON.stringify({ ticks: spentTicks }), spentTicks);
                if (mark > 0) {
                    WorldFeedback.onEffect(scope, mark, "gigatonhammer:spent", gigatonhammerScene, 1, centre,
                        { moment: "spent", target: String(actor.ref()), scale: scale, linger: spentTicks, seconds: Math.round(spentTicks / 20) });
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.3, 0)), gigatonhammerTiredText, [Math.round(spentTicks / 20)], 30);
                }
                scenes.finish(current, done);
            }

            // 锤落：近圈（过顶）或绕身一圈（横扫）内每个非友方只吃一次 hammer。
            function slam(current: CombatAction): void {
                const scope = current.world();
                const centre = sweep ? origin : ground;
                const radius = sweep ? shockLength : Math.max(0.9, halfWidth * 0.8);
                scenes.show(current, "slam", centre,
                    { moment: "slam", reach: reach, radius: radius, dust: dust, scale: scale, intensity: intensity,
                        sweep: sweep ? 1 : 0, direction: [direction.x(), direction.y(), direction.z()] });
                sound(action, "minecraft:entity.iron_golem.attack");
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, 0, radius, { below: 1.4, above: 2.6 }),
                    function (victim, facts) {
                        const ref = String(victim.ref());
                        if (struck[ref]) return;
                        if (!hurt(current, victim, gigatonhammerId, hammer, { damage: damageSpec(gigatonhammerId, "hammer"), contact: true })) return;
                        struck[ref] = true;
                        const at = scope.observe(victim);
                        const point = at === null ? facts.position() : at.position();
                        if (sweep) displaceBack(scope, victim, WorldCombat.point(point.x() - origin.x(), 0, point.z() - origin.z()));
                        else displaceBack(scope, victim, direction);
                        WorldFeedback.emit(scope, gigatonhammerScene, 1, point,
                            { moment: "hit", point: [point.x(), point.y(), point.z()], target: ref, dust: dust, scale: scale, intensity: intensity }, 26);
                        sound(current, "cobblemon:impact.steel");
                    });
            }

            // 冲击波：过顶式沿地面分三段依序前移，每段只结算真正走到的那一截；已吃主锤的目标不再吃波。
            function segment(current: CombatAction, index: number): void {
                const scope = current.world();
                const span = shockLength / 3;
                const from = ground.plus(direction.scale(span * index));
                const to = ground.plus(direction.scale(span * (index + 1)));
                scenes.show(current, "wave", to,
                    { moment: "wave", path: gigatonhammerLane(from, direction, span, halfWidth), length: span, width: halfWidth * 2,
                        dust: dust, scale: scale, intensity: Math.max(0.5, intensity * 0.8), front: (index + 1) / 3,
                        direction: [direction.x(), direction.y(), direction.z()], sweep: 0 });
                WorldGeometry.selectEnemies(scope, WorldGeometry.lane(from, direction, span, halfWidth, { below: 1.4, above: 2.6 }),
                    function (victim, facts) {
                        const ref = String(victim.ref());
                        if (struck[ref]) return;
                        if (!hurt(current, victim, gigatonhammerId, wave, { damage: damageSpec(gigatonhammerId, "wave") })) return;
                        struck[ref] = true;
                        waveHits++;
                        const at = scope.observe(victim);
                        const point = at === null ? facts.position() : at.position();
                        displaceBack(scope, victim, direction);
                        WorldFeedback.emit(scope, gigatonhammerScene, 1, point,
                            { moment: "wave_hit", point: [point.x(), point.y(), point.z()], target: ref, dust: Math.round(dust * 0.7),
                                scale: scale, intensity: Math.max(0.5, intensity * 0.7) }, 24);
                    });
                if (index < 2) { current.after(Math.max(2, Math.round(span / shockSpeed)), function (next: CombatAction) { segment(next, index + 1); }); return; }
                settle(current);
            }

            slam(action);
            if (sweep) settle(action);
            else segment(action, 0);
        }
    });
}
