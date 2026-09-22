/**
 * 集沙 / Shore Up —— 执行组织。
 *
 * 核心念头：把脚边的散沙一缕缕卷起来、糊到身上堵住伤口；能取到多少沙，就补回多少。
 *
 * 出手：共享节奏。windup（提交前）只播预告——脚边的沙粒先被吸起来；准备可被打断，不花代价。
 * 结算（提交后，一次结算）：按 `grains` 从探沙范围内挖走松散沙块（`world.breakBlock`，沙被消耗后留在挖开的状态），
 *   再按 `heal` 回复自己——`heal` 读的是取沙那一刻的散沙密度与沙暴身份，所以站在沙地上的这一口明显更足。
 * 画面：起沙（gather）→ 糊身（pack）→ 余尘（settle）；沙暴中额外镀上一层亮沙。
 *
 * 反制：这招吃地面——把施法者逼离沙地／沙丘，它就只剩一点土尘；同一片沙地被反复使用会变薄。
 * 与同族分开：光合作用只读光照、不改世界；羽栖是落地分段；集沙**真的把地面的沙拿走**，并在沙暴里最强。
 */
namespace PokemonSkills {
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

    /** 从探沙范围内由近及远挖走松散沙块；返回真正取到的块数。 */
    function shoreupGather(world: CombatWorld, feet: CombatPoint, reach: number, budget: number): number {
        if (budget <= 0) return 0;
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
        var gathered = 0;
        for (var i = 0; i < cells.length && gathered < budget; i++) {
            if (world.breakBlock(WorldCombat.point(cells[i][0], cells[i][1], cells[i][2]), true) !== "") continue;
            gathered++;
        }
        return gathered;
    }

    define({
        id: shoreupId, name: "集沙",
        description: "把脚边的散沙卷起来糊到身上，回复最大生命的一半左右；身边的沙越密回得越多，身处沙暴时回到约三分之二。取沙会真的把地面的沙挖走，同一片沙地反复使用会变薄。",
        uses: ["站在沙地上补一大口", "借沙暴的风取之不尽的沙回血", "消耗脚下的沙地换取一次强回复"],
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
                JSON.stringify({ moment: "windup", motes: p(shoreupId, "grainDensity", action), target: String(action.actor().ref()) }));
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
            var gathered = shoreupGather(world, feet, reach, budget);
            var before = body.health();
            shoreupHeal(world, self, healFraction, "shoreup");
            var after = world.observe(self);
            var gained = after ? Math.max(0, after.health() - before) : 0;
            var scale = Math.max(0.7, Math.min(1.8, reach / 2.6));
            var motes = Math.max(10, Math.round(density * (storm ? 1.35 : 0.85) + gathered * 3));
            var gild = storm ? Math.max(10, Math.round(motes * 0.6)) : 0;

            sound(action, "minecraft:block.sand.place");
            WorldFeedback.emit(world, shoreupScene, 1, feet,
                { moment: "gather", target: String(self.ref()), motes: motes, gathered: gathered, budget: budget, reach: reach, storm: storm ? 1 : 0, scale: scale }, 30);
            WorldFeedback.emit(world, shoreupScene, 1, body.position(),
                { moment: "pack", target: String(self.ref()), motes: motes, gild: gild, gathered: gathered, storm: storm ? 1 : 0, thick: thick ? 1 : 0, scale: scale }, 30);
            WorldFeedback.emit(world, shoreupScene, 1, feet,
                { moment: "settle", target: String(self.ref()), motes: Math.round(motes * 0.5), scale: scale }, 26);
            WorldFeedback.text(world, shoreupAbove(body.position()),
                storm ? shoreupTextStorm : gathered > 0 ? shoreupTextSand : shoreupTextDust, [Math.round(gained * 10) / 10], 30);
            done(action);
        }
    });
}
