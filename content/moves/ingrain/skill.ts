/**
 * 扎根 / ingrain 的执行组织。
 *
 * 核心念头：从脚底把根须插进土里，就地钉住自己；此后每一拍沿着这些根从地里抽上一点生机，回一口血。
 *   它是自我回复族里唯一拿**移动**换续血的一招：根一扎下就走不掉，回得慢但撑得久。
 *
 * 两幕半：
 *   扎根（windup 播「下沉」，提交前只观察与预告，可被打断，打断不花代价）。
 *   扎定（提交后）：脚下那块地被根须顶成 rooted_dirt（租借，拔根时还原），共享 rooted 把移速归零、钉住自己；
 *     挂上真实 MobEffect world_combat:ingrain（共享身份 world_combat:status/ingrain），旁边一枚机读标记带走间隔、
 *     每拍回量、根须数与半径。
 *   抽养（pulse × N）：每 `interval` 刻回 `pulse` 比例的最大生命，脚下画一环、根须间升起绿光。
 * 结束：时间走完或被清除（牛奶／/effect clear）都拔根：解除 rooted、根须消退、地面还原，根环散去。
 *
 * 与水流环分开：水流环可以边走边回；扎根把自己钉在一块地上，回得更慢但更耐久，且真的改了脚下的地。
 */
namespace PokemonSkills {
    const ingrainScene = "world_combat:move_ingrain";
    const ingrainEffect = "world_combat:ingrain";
    const ingrainMark = "world_combat:ingrain_mark";
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
    WorldCombat.effectHandler(ingrainMark, "start", function (effect) {
        const data = JSON.parse(effect.state());
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(ingrainMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(ingrainMark, "end", function (effect) {
        const world = effect.world(), self = effect.target();
        if (world.valid(self)) {
            if (CombatStatus.has(world, self, "ingrain")) CombatStatus.cure(world, self, "ingrain");
            const data = JSON.parse(effect.state());
            if (typeof data.rooted === "number") world.operation(data.rooted, "world_combat:dispel", "{}");
            if (typeof data.terrain === "number") { try { world.removeTerrain(data.terrain); } catch (error) { } }
            const body = world.observe(self);
            if (body !== null) {
                WorldFeedback.emit(world, ingrainScene, 1, body.position(), { moment: "fade", target: String(self.ref()) }, 24);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.0, 0)), ingrainTextRelease, [], 22);
            }
        }
    });

    // 每拍沿根须抽一口生机。
    WorldCombat.effectHandler(ingrainMark, "pulse", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) { effect.end(); return; }
        const body = world.observe(self);
        if (body === null) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        const interval = Math.max(1, Math.round(data.interval));
        const radius = Math.max(0.5, Number(data.radius) || 0.8);
        const scale = Math.max(0.5, Math.min(2.0, radius / ingrainReferenceRadius));
        const healed = heal(world, self, Math.max(0.004, Number(data.pulse) || 0.06), "ingrain");
        WorldFeedback.emit(world, ingrainScene, 1, body.position(),
            { moment: "pulse", target: String(self.ref()), roots: Math.round(Number(data.roots) || 12), scale: scale,
                healed: Math.round(healed * 10) / 10,
                intensity: Math.max(0.5, Math.min(2, healed / Math.max(1, body.maxHealth()) * 26)) }, 22);
        WorldFeedback.keep(world, "world_combat:move_ingrain/roots/" + String(self.ref()), ingrainScene, 1, body.position(),
            { moment: "roots", target: String(self.ref()), roots: Math.round(Number(data.roots) || 12), scale: scale }, Math.max(30, interval + 15));
        if (healed > 0) world.sound("minecraft:block.moss.place", body.position(), 9, "{}");
        effect.schedule("pulse", "pulse", interval, "{}");
    });

    // 根环被清掉（牛奶／/effect clear／到期）时收回标记，避免留下没有结算的根。
    WorldCombat.on("world_combat:move_ingrain/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== ingrainEffect) return;
        const world = event.world(), self = event.actor();
        if (!world.valid(self)) return;
        const marks = world.effects(self, ingrainMark);
        for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
    });

    /** 把脚下的地换成 rooted_dirt：租借、到期原方块回来；只动天然地表，不动水、岩浆、基岩。 */
    function ingrainSoil(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [];
        const r = Math.ceil(radius);
        const cx = Math.floor(centre.x()), cz = Math.floor(centre.z()), cy = Math.floor(centre.y());
        const soil: { [id: string]: boolean } = {
            "minecraft:grass_block": true, "minecraft:dirt": true, "minecraft:coarse_dirt": true, "minecraft:podzol": true,
            "minecraft:moss_block": true, "minecraft:farmland": true, "minecraft:sand": true, "minecraft:red_sand": true,
            "minecraft:gravel": true, "minecraft:clay": true, "minecraft:mycelium": true, "minecraft:stone": true,
            "minecraft:deepslate": true, "minecraft:andesite": true, "minecraft:diorite": true, "minecraft:granite": true
        };
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            const x = cx + dx, z = cz + dz;
            for (let dy = 1; dy >= -3; dy--) {
                const y = cy + dy;
                const block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                if (soil[id] && id !== "minecraft:rooted_dirt") cells.push({ x: x, y: y, z: z, block: "minecraft:rooted_dirt" });
                break;
            }
        }
        if (!cells.length) return 0;
        try { return world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
    }

    define({
        freeMovement: true,
        requiresGround: true,
        id: "ingrain",
        cooldownParameter: "wait",
        name: "Ingrain",
        description: "把根扎进脚下的大地，就地钉住自己；此后每隔一会儿沿根须抽上来一口血。扎根期间无法移动，根被清除或走完才拔根。",
        uses: ["在拉锯里把自己钉在一块地上，换来更耐久的小口回血", "把脚下的土变成根须地，标记这块阵地", "被追击时用扎根换一段稳定续航，赌对手打不穿"],
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
            const terrain = ingrainSoil(world, feet, radius, ticks);
            const marks = world.effects(self, ingrainMark);
            for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
            world.effect(ingrainMark, self, JSON.stringify({ start: world.tick(), interval: interval, pulse: pulse,
                ticks: ticks, roots: roots, radius: radius, rooted: rooted, terrain: terrain }), ticks);
            WorldFeedback.emit(world, ingrainScene, 1, feet,
                { moment: "root", target: String(self.ref()), roots: roots, radius: radius, scale: scale,
                    intensity: Math.max(0.7, Math.min(2, 0.7 + roots / 26 + pulse * 6)) }, 30);
            WorldFeedback.keep(world, "world_combat:move_ingrain/roots/" + String(self.ref()), ingrainScene, 1, body.position(),
                { moment: "roots", target: String(self.ref()), roots: roots, scale: scale }, Math.min(ticks, 600));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.0, 0)), ingrainTextRoot, [Math.round(interval / 20)], 26);
            world.sound("minecraft:block.rooted_dirt.place", body.position(), 14, "{}");
            done(action);
        }
    });
}
