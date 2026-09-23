/**
 * 落石 / rockthrow 的出手方式。
 *
 * 核心念头：**低头从脚边地上抄起一块小石，平直、快速地把它甩出去**——它是岩系里最随手的一记：
 *   起手最短、冷却最低、只出一块石头，也什么都不留下。石头朝松手那一刻的位置飞、不追踪，所以对手
 *   在石头离手后挪一步就能让开；这一记卖的是「便宜、能动、可以一记接一记地扔」。
 *
 * 两幕（提交前只播预告）：
 *   抄（scoop，提交前）：低头、脚边尘土与石屑向手心收，只播预告。
 *   扔（release → flight → hit / ground）：提交后把石头沿瞄准方向甩出；平击式贴身体高度平直飞，
 *       高抛式走一道能越过矮墙的弧。命中活物砸一记 `stone` 物理伤害并崩出石屑；落到地面只扬一点尘。
 *
 * 与同族分开：岩石爆击是一梭带弧线的多发石、把落点砸成碎石；岩石封锁投重石封地；岩崩罩一片；
 *   落石只有一块、走直线、不接触地面、不留痕——玩家凭「一小块石头快而平地飞出去」认出它。
 *
 * 配置 `lob`（高抛式）由公式改弧坠/散布/威力/石速、由 resolve 改时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const rockthrowScene = "world_combat:move_rockthrow";
    const rockthrowMissText = "world_combat.move.rockthrow.text.miss";

    /** 把地表方块归到一个「岩石类」材质：沙归沙岩、深板岩归碎深板岩，其余石质归圆石。 */
    function rockthrowGroundMaterial(id: string): string {
        const value = String(id);
        if (value.indexOf("red_sand") >= 0) return "minecraft:red_sandstone";
        if (value.indexOf("sand") >= 0) return "minecraft:sandstone";
        if (value.indexOf("deepslate") >= 0) return "minecraft:cobbled_deepslate";
        if (value.indexOf("blackstone") >= 0) return "minecraft:blackstone";
        if (value.indexOf("basalt") >= 0) return "minecraft:basalt";
        if (value.indexOf("netherrack") >= 0) return "minecraft:netherrack";
        if (value.indexOf("tuff") >= 0) return "minecraft:tuff";
        if (value.indexOf("andesite") >= 0) return "minecraft:andesite";
        if (value.indexOf("diorite") >= 0) return "minecraft:diorite";
        if (value.indexOf("granite") >= 0) return "minecraft:granite";
        if (value.indexOf("terracotta") >= 0) return "minecraft:terracotta";
        if (value.indexOf("gravel") >= 0) return "minecraft:gravel";
        if (value.indexOf("ice") >= 0) return "minecraft:packed_ice";
        if (value.indexOf("obsidian") >= 0) return "minecraft:obsidian";
        if (value.indexOf("dirt") >= 0 || value.indexOf("podzol") >= 0 || value.indexOf("mycelium") >= 0) return "minecraft:dirt";
        return "minecraft:cobblestone";
    }

    /** 读施法者脚下最近的一层实心方块，作为这一块石头的材质来源。 */
    function rockthrowSurface(world: CombatWorld, at: CombatPoint): string {
        for (let dy = 1; dy >= -3; dy--) {
            const block = world.block(WorldCombat.point(at.x(), at.y() + dy, at.z()));
            if (block === null) continue;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava") continue;
            return rockthrowGroundMaterial(id);
        }
        return "minecraft:cobblestone";
    }

    /** 把抛掷方向绕世界 Y 轴偏一个角度，做出散布。 */
    function rockthrowScatter(direction: CombatPoint, angle: number): CombatPoint {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);
    }

    define({
        id: "rockthrow",
        cooldownParameter: "recharge",
        name: "Rock Throw",
        description: "从脚边地上抄起一块小石，平直、快速地甩向目标：一块石头一次伤害，砸中崩出石屑。石头不追踪，对手在它离手后挪一步就能让开；高抛式能越过矮墙，但更散更慢。",
        uses: ["便宜的远程消耗，一记接一记地扔", "对站着不动的目标稳定点射", "用高抛式越过掩体打后面的目标"],
        kind: "enemy",
        range: 6,
        maxRange: 12,
        prepare: 4,
        active: 0,
        recover: 5,
        cooldown: 11,
        style: "rock",
        maximumTicks: 120,
        defaults: { lob: false, ai: { maxChase: 12, finish: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("rockthrow", "reach", pokemon), geometry: "line", style: "rock", color: 0xA98C6A,
                label: config && config.lob === true ? "高抛落石" : "平击落石" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["rockthrow"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("rockthrow", "tempo", context)),
                recover: Math.round(p("rockthrow", "aftercast", context)),
                cooldown: Math.round(p("rockthrow", "recharge", context)),
                active: 0,
                range: p("rockthrow", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            const radius = p("rockthrow", "radius", action);
            action.present("world_combat:rockthrow:" + action.id(), rockthrowScene, 1, action.origin(), JSON.stringify({
                moment: "scoop", lob: config && config.lob === true ? 1 : 0, scale: scale,
                stone: Math.max(0.5, Math.min(1.6, radius / 0.22)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const target = action.target();
            const point = action.targetPosition();
            const power = p("rockthrow", "stone", action);
            const speed = Math.max(0.4, p("rockthrow", "velocity", action));
            const gravity = Math.max(0, p("rockthrow", "arc", action));
            const radius = Math.max(0.12, p("rockthrow", "radius", action));
            const reach = Math.max(3, p("rockthrow", "reach", action));
            const spread = Math.max(0.5, p("rockthrow", "scatter", action));
            const shards = Math.max(4, Math.round(p("rockthrow", "shards", action)));
            const lob = !!(config && config.lob);
            const material = rockthrowSurface(world, origin);
            const scale = Math.max(0.6, Math.min(1.6, radius / 0.22));
            const intensity = Math.max(0.5, Math.min(2.0, power / 40));
            const distance = point.minus(origin).length();
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            let direction = lob && target !== null ? LivingActions.ballistic(origin, point, speed, gravity) : null;
            if (direction === null) direction = aim(action);
            direction = rockthrowScatter(direction, (world.random() * 2 - 1) * spread * Math.PI / 180);

            sound(action, "cobblemon:move.rockthrow.actor");
            WorldFeedback.emit(world, rockthrowScene, 1, origin,
                { moment: "release", lob: lob ? 1 : 0, shards: shards, scale: scale, intensity: intensity }, 16);

            const flight = LivingActions.projectile(action, {
                speed: speed, direction: direction, gravity: gravity, range: Math.max(reach, distance + 3),
                radius: radius, lifetime: Math.max(24, Math.round((distance + 3) / Math.max(0.3, speed)) + 24),
                appearance: { block: material, spin: true, scale: Math.max(0.4, Math.min(0.9, radius * 2.2)) } as any,
                impact: function (inner: CombatAction, hit: CombatImpact): void {
                    const scope = inner.world(), at = hit.position(), struck = hit.target();
                    if (hit.hitEntity() && struck !== null && scope.valid(struck) && !scope.friendly(struck)) {
                        if (!impact(inner, hit, "rockthrow", power, { damage: damageSpec("rockthrow", "stone") })) return;
                        WorldFeedback.emit(scope, rockthrowScene, 1, at,
                            { moment: "hit", target: String(struck.ref()), shards: shards, scale: scale, intensity: intensity }, 20);
                        sound(inner, "cobblemon:impact.rock");
                        return;
                    }
                    WorldFeedback.emit(scope, rockthrowScene, 1, at,
                        { moment: "ground", shards: Math.round(shards * 0.5), scale: scale }, 16);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.5, 0)), rockthrowMissText, [], 18);
                }
            }, function (inner: CombatAction) { finish(inner); });
            WorldFeedback.keep(world, "rockthrow:flight:" + action.id(), rockthrowScene, 1, origin,
                { moment: "flight", projectile: flight, shards: shards, scale: scale, intensity: intensity }, 120);
        }
    });
}
