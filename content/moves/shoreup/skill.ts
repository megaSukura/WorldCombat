/**
 * 集沙 / Shore Up —— 执行组织。
 *
 * 核心念头：把脚边的散沙一缕缕卷起来、糊到身上堵住伤口；能取到多少沙，就补回多少。
 *
 * 出手：共享节奏。windup（提交前）只播预告——脚边的沙粒先被吸起来；准备可被打断，不花代价。
 * 结算（提交后，一次结算）：只**读取**探沙范围内实际有沙的位置并据此扬起沙粒（`shoreupSite`，不改地形），
 *   再把明确落在脚边的松散沙**掉落物**收走（`shoreupDrawDrops`，这是唯一修改世界的一步）；随后按 `heal`
 *   回复自己——`heal` 读的是取沙那一刻的散沙密度与沙暴身份，所以站在沙地上的这一口明显更足。
 * 画面：起沙（gather，含每个真实沙位的 gather_site）→ 糊身（pack，数量随实际回复）→ 余尘（settle）；沙暴中额外镀亮沙。
 *
 * 反制：这招吃地面——把施法者逼离沙地／沙丘，它就只剩一点土尘；但脚下的承重沙块不会被挖走，地表保持连续，
 *   所以它不会把战场越用越烂，只会收走散落的浮沙。
 * 与同族分开：光合作用只读光照；羽栖是落地分段；集沙吃地面材质，并在沙暴里最强。
 */
namespace PokemonSkills {
    declare const Java: { loadClass(name: string): any };
    const shoreupScene = "world_combat:move_shoreup";
    const shoreupTextStorm = "world_combat.move.shoreup.text.storm";
    const shoreupTextSand = "world_combat.move.shoreup.text.sand";
    const shoreupTextDust = "world_combat.move.shoreup.text.dust";

    function shoreupAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.85, 0)); }

    /** 回复走共享健康写入；宝可梦经过 NativeEffects.heal（含受治疗加成），其他战斗者直接写 MC 生命。 */
    function shoreupHeal(world: CombatWorld, target: CombatActor, fraction: number, cause: string): number {
        var body = world.observe(target);
        if (!body) return 0;
        var missing = body.maxHealth() - body.health();
        if (missing <= 0) return 0;
        var amount = Math.min(missing, body.maxHealth() * Math.max(0, Math.min(1, fraction)));
        if (amount <= 0) return 0;
        var healed = 0;
        if (String(target.domain()) === "cobblemon" && world.valid(target)) {
            var pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, target, pokemon, amount / scale, cause);
        } else {
            healed = world.health(target, amount, "world_combat:" + cause);
        }
        var after = world.observe(target);
        if (healed > 0 && after) feedback(world, target, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    /** 由近及远读取探沙范围内实际有松散沙的位置（只读，不破坏地形）；返回最多 `limit` 个沙块顶面中心。 */
    function shoreupSite(world: CombatWorld, feet: CombatPoint, reach: number, limit: number): CombatPoint[] {
        var points: CombatPoint[] = [];
        if (limit <= 0) return points;
        var cx = Math.floor(feet.x()), cy = Math.floor(feet.y()), cz = Math.floor(feet.z());
        var radius = Math.max(1, Math.ceil(reach));
        var cells: number[][] = [];
        for (var dx = -radius; dx <= radius; dx++) for (var dz = -radius; dz <= radius; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > reach) continue;
            for (var dy = 0; dy >= -2; dy--) {
                if (!shoreupLoose(world.block(WorldCombat.point(cx + dx, cy + dy, cz + dz)))) continue;
                cells.push([cx + dx, cy + dy, cz + dz]);
                break;
            }
        }
        cells.sort(function (a: number[], b: number[]): number {
            var da = (a[0] - cx) * (a[0] - cx) + (a[2] - cz) * (a[2] - cz);
            var db = (b[0] - cx) * (b[0] - cx) + (b[2] - cz) * (b[2] - cz);
            return da - db;
        });
        for (var i = 0; i < cells.length && points.length < limit; i++)
            points.push(WorldCombat.point(cells[i][0] + 0.5, cells[i][1] + 1, cells[i][2] + 0.5));
        return points;
    }

    /** 收走脚边明确掉落的松散沙（真正修改世界的一步）；返回取走的粒数与它们的实际位置。 */
    function shoreupDrawDrops(world: CombatWorld, feet: CombatPoint, reach: number, limit: number): { count: number; points: CombatPoint[] } {
        var result = { count: 0, points: [] as CombatPoint[] };
        if (limit <= 0) return result;
        var entities: any[] = world.nativeEntities(feet, reach, "minecraft:item") as any;
        if (!entities || entities.length === 0) return result;
        var Registries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
        for (var i = 0; i < entities.length && result.count < limit; i++) {
            var item = entities[i], stack = item.getItem();
            if (!stack || stack.isEmpty()) continue;
            var id = String(Registries.ITEM.getKey(stack.getItem()));
            if (id !== "minecraft:sand" && id !== "minecraft:red_sand") continue;
            var at = WorldCombat.point(Number(item.getX()), Number(item.getY()), Number(item.getZ()));
            item.discard();
            result.count++;
            result.points.push(at);
        }
        return result;
    }

    define({
        id: shoreupId, name: "集沙",
        description: "把脚边的散沙卷起来糊到身上，回复最大生命的一半左右；身边的沙越密回得越多，身处沙暴时回到约三分之二。取材只读取地面的沙、不挖走承重沙块，地表保持连续；只有落在脚边的松散沙掉落物会被收走。",
        uses: ["站在沙地上补一大口", "借沙暴的风取之不尽的沙回血", "收拢脚下的浮沙换取一次强回复"],
        kind: "self", range: 0, prepare: 14, active: 0, recover: 8, cooldown: 210, style: "sand", maximumTicks: 200,
        defaults: { thick: false },
        fields: [flag("thick", "厚结")],
        indicator: function (config) { return { radius: config && config.thick === true ? 3 : 2, style: "sand", color: 0xD8B26A, label: config && config.thick === true ? "厚结" : "薄敷" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[shoreupId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            var thick = config && config.thick === true;
            return {
                prepare: Math.max(4, Math.round(p(shoreupId, "gather", context))),
                recover: Math.max(3, Math.round(p(shoreupId, "settle", context))),
                cooldown: Math.round(p(shoreupId, "cooldown", context) * (thick ? 1.1 : 0.96)),
                active: 0, range: 0
            };
        },
        ready: function (action) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            if (!body) return "invalid-target";
            if (body.health() >= body.maxHealth() - 0.01) return "nothing-to-restore";
            return "";
        },
        windup: function (action, _config, prepare) {
            action.present("shoreup:windup", shoreupScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", motes: p(shoreupId, "grainDensity", action) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var thick = config && config.thick === true;
            var healFraction = Math.max(0, Math.min(1, p(shoreupId, "heal", action)));
            var budget = Math.max(0, Math.round(p(shoreupId, "grains", action)));
            var reach = Math.max(1, p(shoreupId, "sandReach", action));
            var density = Math.max(8, Math.round(p(shoreupId, "grainDensity", action)));
            var storm = CombatStatus.has(world, self, "sandstorm") || WorldEnvironment.weather(world, body.position()) === "sandstorm";
            var feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            var sites = shoreupSite(world, feet, reach, budget);
            var drawn = shoreupDrawDrops(world, feet, reach, budget);
            var before = body.health();
            shoreupHeal(world, self, healFraction, "shoreup");
            var after = world.observe(self);
            var gained = after ? Math.max(0, after.health() - before) : 0;
            var share = body.maxHealth() > 0 ? Math.max(0, Math.min(1, gained / body.maxHealth())) : 0;
            var scale = Math.max(0.7, Math.min(1.8, reach / 2.6));
            var motes = Math.max(10, Math.round(density * (storm ? 1.35 : 0.85) + drawn.count * 3));
            var gild = storm ? Math.max(10, Math.round(motes * 0.6)) : 0;
            var packMotes = Math.max(8, Math.round(motes * (0.5 + share)));
            var siteMotes = Math.max(4, Math.round(motes / (sites.length + drawn.points.length + 1)));
            var siteSize = scale * 0.06;

            sound(action, "minecraft:block.sand.place");
            WorldFeedback.emit(world, shoreupScene, 1, feet,
                { moment: "gather", motes: motes, reach: reach, scale: scale }, 30);
            for (var i = 0; i < sites.length && i < 6; i++)
                WorldFeedback.emit(world, shoreupScene, 1, sites[i],
                    { moment: "gather_site", motes: siteMotes, siteSize: siteSize }, 24);
            for (var j = 0; j < drawn.points.length && j < 6; j++)
                WorldFeedback.emit(world, shoreupScene, 1, drawn.points[j],
                    { moment: "gather_site", motes: siteMotes, siteSize: siteSize }, 24);
            WorldFeedback.emit(world, shoreupScene, 1, body.position(),
                { moment: "pack", motes: packMotes, gild: gild, packSize: scale * (thick ? 1.3 : 1) }, 30);
            WorldFeedback.emit(world, shoreupScene, 1, feet,
                { moment: "settle", motes: Math.round(motes * 0.5), scale: scale }, 26);
            WorldFeedback.text(world, shoreupAbove(body.position()),
                storm ? shoreupTextStorm : (sites.length > 0 || drawn.count > 0) ? shoreupTextSand : shoreupTextDust,
                [Math.round(gained * 10) / 10], 30);
            done(action);
        }
    });
}
