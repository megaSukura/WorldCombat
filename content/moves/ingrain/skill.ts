/**
 * 扎根 / ingrain 的执行组织。
 *
 * 核心念头：从脚底把根须插进土里，就地钉住自己；此后每一拍沿着这些根从地里抽上一点生机，回一口血。
 *   它是自我回复族里唯一拿**移动**换续血的一招：根一扎下就走不掉，回得慢但撑得久。
 *
 * 两幕半：
 *   扎根（windup 播「下沉」，提交前只观察与预告，可被打断，打断不花代价）。
 *   扎定（提交后）：共享 rooted 把移速归零、钉住自己；挂上真实 MobEffect world_combat:ingrain
 *     （共享身份 world_combat:status/ingrain），旁边一枚机读标记带走间隔、每拍回量、根须数、半径、
 *     本次 rooted 的 id 与本次 carrier 的 lease。
 *   抽养（pulse × N）：每 `interval` 刻回 `pulse` 比例的最大生命；只有真的回了血，才从根须间向身体输送一次生机。
 * 结束：时间走完或被清除（牛奶／/effect clear／主动 dispel）都拔根：解除本次 rooted、根须表现随标记收走、根环散去。
 *
 * 一致性：标记是唯一的根主。标记用 lease 认住本次 carrier，并记住本次 rooted 的 id：
 *   脚下失去真实支撑、本次 rooted 被外力拔掉、或 carrier 被清除／替换，短频率巡检立即拔根，
 *   不留「还号称扎根却已能走」或「拔掉别人的根还继续回血」的缝隙；标记结束只撤自己认下的那一次。
 * 与水流环分开：水流环可以边走边回；扎根把自己钉在一块地上，回得更慢但更耐久。
 */
namespace PokemonSkills {
    const ingrainScene = "world_combat:move_ingrain";
    const ingrainEffect = "world_combat:ingrain";
    const ingrainMark = "world_combat:ingrain_mark";
    const ingrainRootKey = "world_combat:move_ingrain/roots";
    const ingrainTextRoot = "world_combat.move.ingrain.text.root";
    const ingrainTextRelease = "world_combat.move.ingrain.text.release";
    /** 表现里的参考半径：`data.scale = 实际根域半径 / 这个数`。 */
    const ingrainReferenceRadius = 1.2;

    WorldCombat.effect(ingrainMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["start", "interval", "pulse", "ticks", "roots", "radius", "rooted", "lease"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid ingrain value: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(ingrainMark, "start", function (effect) {
        const world = effect.world(), self = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(self)) { effect.end(); return; }
        // 认住本次 carrier 的修订：别人重铺、牛奶清除或到期都会让旧 lease 失效。
        const lease = MobEffects.bind(world, self, ingrainEffect);
        if (!lease) {
            if (CombatStatus.has(world, self, "ingrain")) CombatStatus.cure(world, self, "ingrain");
            effect.end();
            return;
        }
        data.lease = lease;
        effect.state(JSON.stringify(data));
        ingrainRoots(world, self, effect.id(), data);
        effect.schedule("watch", "watch", 5, "{}");
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    // 短频率巡检：脚下真实支撑没了、本次 rooted 被拔掉、或本次 carrier 失效，立刻拔根；回血留在慢节拍。
    WorldCombat.effectHandler(ingrainMark, "watch", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) { effect.end(); return; }
        const body = world.observe(self);
        if (body === null) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        if (!MobEffects.present(world, data.lease) || !ingrainRooted(world, self, data.rooted) || !ingrainSupported(world, body)) { effect.end(); return; }
        effect.schedule("watch", "watch", 5, "{}");
    });
    WorldCombat.effectHandler(ingrainMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(ingrainMark, "end", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) return;
        const data = JSON.parse(effect.state());
        // 只拔本次那一次 rooted：后加/别人的根有不同的 id，动不到。
        if (typeof data.rooted === "number" && data.rooted > 0) world.operation(data.rooted, "world_combat:dispel", "{}");
        const body = world.observe(self);
        if (body === null) return;
        const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
        WorldFeedback.emit(world, ingrainScene, 1, feet, { moment: "fade", target: String(self.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.0, 0)), ingrainTextRelease, [], 22);
    });

    /** 脚下根须的持续低密度表现；位置固定在扎下的脚点，随标记效果的生命周期清理。 */
    function ingrainRoots(world: CombatWorld, self: CombatActor, markId: number, data: any): void {
        if (!(markId > 0) || !world.valid(self)) return;
        const body = world.observe(self);
        if (body === null) return;
        const roots = Math.max(6, Math.round(Number(data.roots) || 12));
        const scale = Math.max(0.5, Math.min(2.0, (Number(data.radius) || 0.8) / ingrainReferenceRadius));
        const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
        WorldFeedback.onEffect(world, markId, ingrainRootKey, ingrainScene, 1, feet,
            { moment: "roots", target: String(self.ref()), roots: roots, scale: scale });
    }

    /** 本次 root id 是否仍在身上；只认这一次扎下的根，不把别人的 rooted 当成自己的。 */
    function ingrainRooted(world: CombatWorld, self: CombatActor, rootedId: number): boolean {
        if (!(rootedId > 0)) return false;
        const roots = world.effects(self, "world_combat:rooted");
        for (let index = 0; index < roots.length; index++) if (roots[index].id() === rootedId) return true;
        return false;
    }

    /**
     * 脚下是否还有真实支撑：以真实碰撞箱的脚底为准，向下探两格；读到未加载的方块不当作支撑。
     * 这样被击退顶起一瞬不会误拔根，只有真的悬空（脚下连续空气/液体/未知）才失去支撑。
     */
    function ingrainSupported(world: CombatWorld, body: CombatObservation): boolean {
        const feet = body.boundsMin(), base = Math.floor(feet.y() - 0.08);
        for (let dy = 0; dy >= -1; dy--) {
            const block = world.block(WorldCombat.point(feet.x(), base + dy, feet.z()));
            if (block === null) continue;
            const id = String(block.id());
            if (id !== "minecraft:air" && id !== "minecraft:cave_air" && id !== "minecraft:void_air"
                && id !== "minecraft:water" && id !== "minecraft:lava") return true;
        }
        return false;
    }

    // 每拍沿根须抽一口生机；只有真的回了血才向上输送一次。
    WorldCombat.effectHandler(ingrainMark, "pulse", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) { effect.end(); return; }
        const body = world.observe(self);
        if (body === null) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        if (!MobEffects.present(world, data.lease)) { effect.end(); return; }
        const interval = Math.max(1, Math.round(data.interval));
        ingrainRoots(world, self, effect.id(), data);
        const healed = heal(world, self, Math.max(0.004, Number(data.pulse) || 0.06), "ingrain");
        if (healed > 0) {
            const radius = Math.max(0.5, Number(data.radius) || 0.8);
            const scale = Math.max(0.5, Math.min(2.0, radius / ingrainReferenceRadius));
            WorldFeedback.emit(world, ingrainScene, 1, body.position(),
                { moment: "pulse", target: String(self.ref()), roots: Math.round(Number(data.roots) || 12), scale: scale,
                    healed: Math.round(healed * 10) / 10,
                    intensity: Math.max(0.5, Math.min(2, healed / Math.max(1, body.maxHealth()) * 26)) }, 22);
            world.sound("minecraft:block.moss.place", body.position(), 9, "{}");
        }
        effect.schedule("pulse", "pulse", interval, "{}");
    });

    define({
        freeMovement: true,
        requiresGround: true,
        id: "ingrain",
        cooldownParameter: "wait",
        name: "Ingrain",
        description: "把根扎进脚下的大地，就地钉住自己；此后每隔一会儿沿根须抽上来一口血。扎根期间无法移动，根被清除或走完才拔根。",
        uses: ["在拉锯里把自己钉在一块地上，换来更耐久的小口回血", "用不走位换一段稳定续航，把阵地守住", "被追击时用扎根赌对手打不穿"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 8,
        cooldown: 140,
        style: "root",
        stationary: true,
        maximumTicks: 900,
        defaults: { deep: false },
        fields: [],
        indicator: function (config) { return { radius: 1, style: "root", color: 0x6FA83A, label: config && config.deep === true ? "扎根 · 深扎" : "扎根" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["ingrain"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("ingrain", "tempo", context)),
                recover: Math.round(p("ingrain", "aftercast", context)),
                cooldown: Math.round(p("ingrain", "wait", context)),
                active: 1,
                range: 1
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor(), body = world.observe(self);
            if (body === null) return "invalid-target";
            if (!body.grounded()) return "not-grounded";
            if (CombatStatus.has(world, self, "ingrain")) return "already-rooted";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_ingrain:sink", ingrainScene, 1, action.origin(),
                JSON.stringify({ moment: "sink", deep: config && config.deep === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const ticks = Math.max(80, Math.round(p("ingrain", "rootTicks", action)));
            const interval = Math.max(10, Math.round(p("ingrain", "interval", action)));
            const pulse = Math.max(0.005, p("ingrain", "pulse", action));
            const roots = Math.max(6, Math.round(p("ingrain", "roots", action)));
            const radius = Math.max(0.5, p("ingrain", "radius", action));
            const scale = Math.max(0.5, Math.min(2.0, radius / ingrainReferenceRadius));
            // 先安全结束本次自己的旧根（标记结束会释放旧 lease 并拔本次的根），再扎新的。
            const previous = world.effects(self, ingrainMark);
            for (let index = 0; index < previous.length; index++) world.operation(previous[index].id(), "world_combat:dispel", "{}");
            if (!CombatStatus.apply(world, self, "ingrain", ingrainEffect, ticks, 0, { unique: true })) { done(action); return; }
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            const rooted = WorldEffects.apply(world, self, "rooted", {}, ticks);
            if (!(rooted > 0)) { MobEffects.consume(world, self, ingrainEffect); done(action); return; }
            world.effect(ingrainMark, self, JSON.stringify({ start: world.tick(), interval: interval, pulse: pulse,
                ticks: ticks, roots: roots, radius: radius, rooted: rooted, lease: 0 }), ticks);
            WorldFeedback.emit(world, ingrainScene, 1, feet,
                { moment: "root", target: String(self.ref()), roots: roots, radius: radius, scale: scale,
                    intensity: Math.max(0.7, Math.min(2, 0.7 + roots / 26 + pulse * 6)) }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.0, 0)), ingrainTextRoot, [Math.round(interval / 20)], 26);
            world.sound("minecraft:block.rooted_dirt.place", body.position(), 14, "{}");
            done(action);
        }
    });
}
