/**
 * 妖精之锁 / fairylock —— 执行组织。
 *
 * 核心念头：**召下一圈妖精光栅把整块场地封住，谁都走不出这块地——包括你自己。**
 *   它是对等的：术者也被钉住，所以你放它的时机是「先把对手关进来、再由队友集火」；
 *   不在圈里的活体不受影响，被外力推出光栅的则脱锁。
 *
 * 三幕：
 *   聚（windup，提交前）：术者头顶聚起一圈旋转的粉色光点（只观察与预告，可被打断不花代价）。
 *   封（seal，提交后）：以术者为中心立起光栅，半径内每个活体挂上共享身份 `world_combat:status/fairy_locked`
 *      与 `world_combat:status/trapped`，移动归零；随动作之后的持久光栅 `world_combat:fairy_lock_net`
 *      每几刻扫描一次，把新走进来的活体也扣住、把脱出半径的放开。
 *   散（release）：时长走完（或术者倒下）光栅散开，圈内所有被锁的活体同时恢复自由。
 *
 * 与同族分开：黑色目光靠术者站在原地维持、蛛网缠在目标身上怕火、挡路立墙封退路；
 *   妖精之锁是一块**对等的短时场地**，把站进来的所有人一起锁住，术者也跑不掉。
 *
 * 配置 `deep`（深锁）由 resolve 改时序与射程，由公式改时长／半径：锁得更久，但圈更小、更慢更费。
 */
namespace PokemonSkills {
    const fairyScanInterval = 5;
    const fairyReferenceRadius = 5.0;

    function fairyNetData(json: string): string {
        const value = JSON.parse(json);
        if (!Array.isArray(value.position) || value.position.length !== 3) throw new Error("Invalid fairy lock position");
        ["radius", "sealTicks", "lattice", "bars", "scale", "intensity"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid fairy lock state");
        });
        if (!Array.isArray(value.members)) throw new Error("Invalid fairy lock members");
        return JSON.stringify(value);
    }

    function fairyPoint(state: any): CombatPoint {
        return WorldCombat.point(state.position[0], state.position[1], state.position[2]);
    }

    /** 给圈内一个活体挂上（或续上）封印，并播放「被扣住」的一幕；返回它是否是新被扣住的。 */
    function fairyCatch(world: CombatWorld, actor: CombatActor, state: any, isNew: boolean): void {
        MobEffects.apply(world, actor, fairySeal, Math.max(20, Math.round(state.sealTicks)), 0);
        if (!isNew) return;
        const body = world.observe(actor);
        if (body === null) return;
            WorldFeedback.emit(world, fairyScene, 1, body.position(),
                { moment: "caught", target: String(actor.ref()), bars: state.bars, lattice: state.lattice }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), fairyCaughtText, [], 20);
    }

    WorldCombat.effect(fairyNet, 1, 600, "actor", fairyNetData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(fairyNet, "start", function (effect) { effect.schedule("scan", "scan", 1, "{}"); });
    WorldCombat.effectHandler(fairyNet, "scan", function (effect) {
        const world = effect.world(), source = effect.source(), state = JSON.parse(effect.state());
        if (!world.valid(source)) { effect.end(); return; }
        const centre = fairyPoint(state);
        const self = world.observe(source);
        if (self === null || centre.minus(self.position()).length() > 48) { effect.end(); return; }
        const found = world.query(centre, state.radius, false), previous: string[] = state.members, members: string[] = [];
        for (let index = 0; index < found.length; index++) {
            const actor = found[index], body = world.observe(actor);
            if (body === null) continue;
            const ref = String(actor.ref());
            members.push(ref);
            fairyCatch(world, actor, state, previous.indexOf(ref) < 0);
        }
        for (let index = 0; index < previous.length; index++) {
            if (members.indexOf(previous[index]) >= 0) continue;
            const escaped = world.actor(previous[index]);
            if (escaped === null || !world.valid(escaped)) continue;
            const seal = MobEffects.read(world, escaped, fairySeal);
            if (seal !== null) world.removeMobEffect(escaped, fairySeal, seal.key());
        }
        state.members = members;
        effect.state(JSON.stringify(state));
        WorldFeedback.keep(world, "fairy:net:" + String(effect.id()), fairyScene, 1, centre,
            { moment: "net", radius: state.radius, bars: state.bars, lattice: state.lattice,
                scale: state.scale, members: members.length }, Math.min(60, fairyScanInterval + 25));
        effect.schedule("scan", "scan", fairyScanInterval, "{}");
    });
    WorldCombat.effectHandler(fairyNet, "end", function (effect) {
        const world = effect.world(), state = JSON.parse(effect.state());
        for (let index = 0; index < state.members.length; index++) {
            const actor = world.actor(state.members[index]);
            if (actor === null || !world.valid(actor)) continue;
            const seal = MobEffects.read(world, actor, fairySeal);
            if (seal !== null) world.removeMobEffect(actor, fairySeal, seal.key());
        }
        const centre = fairyPoint(state);
        WorldFeedback.emit(world, fairyScene, 1, centre,
            { moment: "release", radius: state.radius, members: state.members.length, scale: state.scale }, 26);
        if (state.members.length > 0) {
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.4, 0)), fairyReleaseText, [state.members.length], 24);
            world.sound("minecraft:block.beacon.deactivate", centre, 12, "{}");
        }
    });

    // 被封印的目标动不了：导航速度归零（移动速度属性由状态效果自带）。
    WorldCombat.on("world_combat:move_fairylock/root", "world_combat:navigate", "", function (event) {
        if (MobEffects.read(event.world(), event.actor(), fairySeal) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    define({
        id: fairyId,
        name: "妖精之锁",
        description: "召下一圈妖精光栅封住一块场地：半径内每个活体（包括你和队友）都被钉在原地，谁也走不出这块地，直到光栅散开。走进去的也会被扣住，被推出光栅的则脱锁。",
        uses: ["把逃向出口的对手关进一块地对等锁住等队友集火", "在狭窄地形把一场混战钉在原地", "把高机动目标关进一小块地里让它没法拉开"],
        kind: "self",
        range: 5,
        maxRange: 8,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 120,
        style: "fairy",
        stationary: true,
        defaults: { deep: false, ai: { maxChase: 10, minTargets: 1, catchRunners: true, leaveStation: false } },
        fields: [
            field(pathOf("deep"), "深锁", "boolean", { help: "开启（深锁）：封印时长 ×1.4；代价是半径 ×0.8、起手 +4 刻、冷却 +20 刻——锁得更久，但圈更小、更慢更费。关闭（广域锁）：圈更大、更快、冷却更短；代价是锁得更短。" })
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[fairyId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(fairyId, "tempo", context)),
                recover: Math.round(p(fairyId, "aftercast", context)),
                cooldown: Math.round(p(fairyId, "recharge", context)),
                active: 1,
                range: p(fairyId, "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_fairylock:charge", fairyScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", deep: config && config.deep === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: p(fairyId, "radius"), geometry: "area", style: "fairy", color: 0xF7A8D8,
                label: config && config.deep === true ? "妖精之锁 · 深锁" : "妖精之锁" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const radius = Math.max(3, p(fairyId, "radius", action));
            const sealTicks = Math.max(40, Math.round(p(fairyId, "sealTicks", action)));
            const lattice = Math.max(10, Math.round(p(fairyId, "lattice", action)));
            const bars = Math.max(4, Math.round(p(fairyId, "bars", action)));
            const scale = Math.max(0.5, Math.min(2.2, radius / fairyReferenceRadius));
            const intensity = Math.max(0.6, Math.min(2.2, lattice / 20 + bars / 14));
            const state: any = { position: [centre.x(), centre.y(), centre.z()], radius: radius,
                sealTicks: sealTicks, lattice: lattice, bars: bars, scale: scale, intensity: intensity, members: [] };

            const existing = world.effects(self, fairyNet);
            for (let index = 0; index < existing.length; index++) world.operation(existing[index].id(), "world_combat:dispel", "{}");

            const found = world.query(centre, radius, false), members: string[] = [];
            for (let index = 0; index < found.length; index++) {
                const actor = found[index];
                if (world.observe(actor) === null) continue;
                members.push(String(actor.ref()));
                fairyCatch(world, actor, state, true);
            }
            state.members = members;
            world.effect(fairyNet, self, JSON.stringify(state), sealTicks);

            WorldFeedback.emit(world, fairyScene, 1, centre,
                { moment: "seal", radius: radius, bars: bars, lattice: lattice, scale: scale,
                    members: members.length }, 34);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.4, 0)), fairySealText, [members.length], 28);
            sound(action, "minecraft:block.beacon.activate");
            sound(action, "minecraft:block.amethyst_block.chime");
            done(action);
        }
    });
}
