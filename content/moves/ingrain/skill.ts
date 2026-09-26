/**
 * 扎根 / ingrain 的执行组织。
 *
 * 核心念头：从脚底把根须插进土里，就地钉住自己；此后每一拍沿着这些根从地里抽上一点生机，回一口血。
 *   它是自我回复族里唯一拿**移动**换续血的一招：根一扎下就走不掉，回得慢但撑得久。
 *
 * 两幕半：
 *   扎根（windup 播「下沉」，提交前只观察与预告，可被打断，打断不花代价）。
 *   扎定（提交后）：共享 rooted 把移速归零、钉住自己；挂上真实 MobEffect world_combat:ingrain
 *     （共享身份 world_combat:status/ingrain），旁边一枚机读标记带走间隔、每拍回量、根须数与半径。
 *   抽养（pulse × N）：每 `interval` 刻回 `pulse` 比例的最大生命；只有真的回了血，才从根须间向身体输送一次生机。
 * 结束：时间走完或被清除（牛奶／/effect clear／主动 dispel）都拔根：解除 rooted、根须表现随标记收走、根环散去。
 *
 * 一致性：标记是唯一的根主，标记结束时会同时收回共享身份与 rooted，不存在「状态没了还锁足」；
 *   反过来，脚下失去支撑或 rooted 被外力拔掉时，下一次抽养立即拔根，不留「还号称扎根却已能走」的缝隙。
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
        ["start", "interval", "pulse", "ticks", "roots", "radius"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid ingrain value: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(ingrainMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(ingrainMark, "start", function (effect) {
        const world = effect.world(), self = effect.target(), data = JSON.parse(effect.state());
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
        // 根须的持续表现绑在标记效果上：标记自然到期或被清除，表现随它一起收，不留残余。
        if (world.valid(self)) ingrainRoots(world, self, effect.id(), data);
    });
    WorldCombat.effectHandler(ingrainMark, "end", function (effect) {
        const world = effect.world(), self = effect.target();
        if (world.valid(self)) {
            if (CombatStatus.has(world, self, "ingrain")) CombatStatus.cure(world, self, "ingrain");
            const data = JSON.parse(effect.state());
            if (typeof data.rooted === "number") world.operation(data.rooted, "world_combat:dispel", "{}");
            const body = world.observe(self);
            if (body !== null) {
                const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
                WorldFeedback.emit(world, ingrainScene, 1, feet, { moment: "fade", target: String(self.ref()) }, 24);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.0, 0)), ingrainTextRelease, [], 22);
            }
        }
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

    /**
     * 脚下是否还有真实支撑：向脚底下方找几格，遇到实心方块就算还踩着地。
     * 这样被击退顶起一瞬不会误拔根；只有真的悬空（脚下连续空气/液体）才失去支撑。
     */
    function ingrainSupported(world: CombatWorld, body: CombatObservation): boolean {
        const p = body.position(), base = Math.floor(p.y() - body.height() / 2);
        for (let dy = 0; dy >= -2; dy--) {
            const block = world.block(WorldCombat.point(p.x(), base + dy, p.z()));
            if (block === null) return true;
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
        // 地面失去支撑，或根被外力拔掉：立即拔根，不让「扎根回血」在已经能走的身子上继续。
        if (!ingrainSupported(world, body) || world.effects(self, "world_combat:rooted").length === 0) { effect.end(); return; }
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

    // 根环被清掉（牛奶／/effect clear／到期／主动 dispel）时收回标记，避免留下没有结算的根。
    WorldCombat.on("world_combat:move_ingrain/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== ingrainEffect) return;
        const world = event.world(), self = event.actor();
        if (!world.valid(self)) return;
        const marks = world.effects(self, ingrainMark);
        for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
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
            if (!CombatStatus.apply(world, self, "ingrain", ingrainEffect, ticks, 0, { unique: true })) { done(action); return; }
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            const rooted = WorldEffects.apply(world, self, "rooted", {}, ticks);
            const marks = world.effects(self, ingrainMark);
            for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
            world.effect(ingrainMark, self, JSON.stringify({ start: world.tick(), interval: interval, pulse: pulse,
                ticks: ticks, roots: roots, radius: radius, rooted: rooted }), ticks);
            WorldFeedback.emit(world, ingrainScene, 1, feet,
                { moment: "root", target: String(self.ref()), roots: roots, radius: radius, scale: scale,
                    intensity: Math.max(0.7, Math.min(2, 0.7 + roots / 26 + pulse * 6)) }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.0, 0)), ingrainTextRoot, [Math.round(interval / 20)], 26);
            world.sound("minecraft:block.rooted_dirt.place", body.position(), 14, "{}");
            done(action);
        }
    });
}
