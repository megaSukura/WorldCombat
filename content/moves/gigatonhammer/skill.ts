/**
 * 巨力锤 / gigatonhammer —— 出手方式。
 *
 * 核心念头：连人带锤旋身蓄力，再把巨锤高高抡下砸在身前地面；锤落处沿地面掀起一道冲击波向前推进，把沿线敌人
 *   一起顶开。砸完身体被惯性拖住：收招很长，而且短时间内无法再抡起巨锤（原生「无法连续使出2次」）。
 *
 * 幕：
 *   起（wind，提交前）：旋身把巨锤抡高，脚边碎屑与钢光散开（`action.present`，可打断、不花 PP）。
 *   砸（slam，提交后）：巨锤落在身前 `reach` 格的地面，主目标结算 `hammer`；锤落掀起冲击波。
 *   波（wave / sweep）：过顶式下冲击波沿地面向前推进 `shockLength` 格、宽 `shockHalfWidth`，波及的非友方结算 `wave`；
 *       横扫式下旋身把锤扫过一圈、半径 `shockLength` 内的敌人直接吃 `hammer`。两边都被顶开 `push` 格。
 *   收（tired）：巨锤的惯性把身体拖住，长收招＋禁复窗口（`eligibility` 门禁实现）。
 *
 * 与同族分开：木槌/冰锤是自伤/减速的单点重击、臂锤是减速横扫；只有巨力锤是**旋身蓄力后沿地面推进的钢属性落锤**。
 */
namespace PokemonSkills {
    /** 落锤走廊的四个角：ground 起、朝 direction 长 length、半宽 half；判定与表现共用同一组顶点。 */
    function gigatonhammerLane(ground: CombatPoint, direction: CombatPoint, length: number, half: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = ground.plus(heading.scale(length));
        return [ground.plus(side.scale(half)), ground.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

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
        description: "连人带锤旋身蓄力，再把巨锤高高抡下砸在身前地面；锤落处沿地面掀起一道冲击波向前推进，把沿线敌人一起顶开。砸完收招很长，短时间内无法再抡起巨锤——换成别的招式可以提前恢复。横扫式让巨锤扫过一圈，代价是威力与节奏。",
        uses: ["旋身蓄力后把巨锤抡下", "用地面冲击波把沿线敌人一起顶开", "被围时用横扫式扫过一圈"],
        kind: "enemy",
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
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const sweep = !!(config && config.sweep);
            const hammer = p(gigatonhammerId, "hammer", action);
            const wave = p(gigatonhammerId, "wave", action);
            const reach = Math.max(2, action.range());
            const shockLength = Math.max(2, p(gigatonhammerId, "shockLength", action));
            const halfWidth = p(gigatonhammerId, "shockHalfWidth", action);
            const push = p(gigatonhammerId, "push", action);
            const dust = Math.max(12, Math.round(p(gigatonhammerId, "dust", action)));
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = self.position();
            let heading = action.targetPosition().minus(origin);
            if (heading.length() < 0.05) heading = action.direction();
            const flat = WorldCombat.point(heading.x(), 0, heading.z());
            const direction = flat.length() < 0.001 ? WorldCombat.point(0, 0, 1) : flat.unit();
            const ground = origin.plus(direction.scale(Math.min(reach, Math.max(0.5, heading.length()))));
            const scale = Math.max(0.5, Math.min(2.4, shockLength / 4.8));
            const intensity = Math.max(0.6, Math.min(2.6, hammer / 160));
            const primaryRef = target !== null ? String(target.ref()) : "";
            const soundPoint = sweep ? origin : ground;
            let primary = false, extra = 0;

            WorldFeedback.emit(world, gigatonhammerScene, 1, soundPoint,
                { moment: "slam", path: sweep ? undefined : gigatonhammerLane(ground, direction, shockLength, halfWidth),
                    reach: reach, shockLength: shockLength, halfWidth: halfWidth, radius: sweep ? shockLength : 1,
                    dust: dust, scale: scale, intensity: intensity, sweep: sweep ? 1 : 0,
                    direction: [direction.x(), direction.y(), direction.z()] }, 34);
            sound(action, "minecraft:entity.iron_golem.attack");

            if (sweep) {
                WorldGeometry.selectEnemies(world, WorldGeometry.ring(origin, 0, shockLength, { below: 1.4, above: 2.6 }),
                    function (victim, facts) {
                        if (!hurt(action, victim, gigatonhammerId, hammer, { damage: damageSpec(gigatonhammerId, "hammer"), contact: true })) return;
                        const isPrimary = String(victim.ref()) === primaryRef;
                        if (isPrimary) primary = true; else extra++;
                        const at = world.observe(victim);
                        const point = at === null ? facts.position() : at.position();
                        const outward = WorldCombat.point(point.x() - origin.x(), 0, point.z() - origin.z());
                        if (world.valid(victim) && outward.length() > 0.01) world.displace(victim, outward.unit().scale(push));
                        WorldFeedback.emit(world, gigatonhammerScene, 1, point,
                            { moment: "hit", target: String(victim.ref()), dust: dust, scale: scale, intensity: intensity }, 26);
                    });
            } else {
                WorldGeometry.selectEnemies(world, WorldGeometry.ring(ground, 0, Math.max(0.9, halfWidth * 0.8), { below: 1.4, above: 2.6 }),
                    function (victim, facts) {
                        const isPrimary = String(victim.ref()) === primaryRef;
                        const power = isPrimary ? hammer : wave;
                        const segment = isPrimary ? "hammer" : "wave";
                        if (!hurt(action, victim, gigatonhammerId, power, { damage: damageSpec(gigatonhammerId, segment), contact: isPrimary })) return;
                        if (isPrimary) primary = true; else extra++;
                        const at = world.observe(victim);
                        const point = at === null ? facts.position() : at.position();
                        if (world.valid(victim)) world.displace(victim, direction.scale(push));
                        WorldFeedback.emit(world, gigatonhammerScene, 1, point,
                            { moment: isPrimary ? "hit" : "wave", target: String(victim.ref()), dust: dust, scale: scale,
                                intensity: isPrimary ? intensity : Math.max(0.5, intensity * 0.7) }, 26);
                    });
                WorldGeometry.selectEnemies(world, WorldGeometry.lane(ground, direction, shockLength, halfWidth, { below: 1.4, above: 2.6 }),
                    function (victim, facts) {
                        if (String(victim.ref()) === primaryRef) return;
                        if (!hurt(action, victim, gigatonhammerId, wave, { damage: damageSpec(gigatonhammerId, "wave") })) return;
                        extra++;
                        if (world.valid(victim)) world.displace(victim, direction.scale(push));
                        WorldFeedback.emit(world, gigatonhammerScene, 1, facts.position(),
                            { moment: "wave", target: String(victim.ref()), dust: Math.round(dust * 0.7), scale: scale,
                                intensity: Math.max(0.5, intensity * 0.7) }, 24);
                    });
            }

            WorldFeedback.emit(world, gigatonhammerScene, 1, ground,
                { moment: "mark", dust: dust, shockLength: shockLength, halfWidth: halfWidth, scale: scale,
                    intensity: intensity, primary: primary ? 1 : 0, extra: extra, sweep: sweep ? 1 : 0 }, 30);
            WorldFeedback.text(world, ground.plus(WorldCombat.point(0, 1.0, 0)), gigatonhammerSlamText,
                [Math.round(hammer), extra], 28);
            world.sound("minecraft:block.anvil.land", ground, 16, "{}");
            world.sound("cobblemon:impact.steel", ground, 14, "{}");

            const rest = world.observe(actor);
            if (rest !== null) {
                WorldFeedback.emit(world, gigatonhammerScene, 1, rest.position(),
                    { moment: "tired", target: String(actor.ref()), scale: scale }, 40);
                WorldFeedback.text(world, rest.position().plus(WorldCombat.point(0, 1.3, 0)), gigatonhammerTiredText, [], 30);
            }
            done(action);
        }
    });
}
