/**
 * 自然之力 / Nature Power —— 注册与动作。
 *
 * 核心念头：你脚下的土地决定这一击是什么。施法者把站立处的地面叫起来，沿地面冲过去，在目标处按地形爆发。
 *
 * 三幕：一幕催动（提交前 `windup` 在脚边掀起土色的召唤环），一幕涌动（提交后一道贴地的地脉冲向目标，
 * 地脉推进时逐段扫过走廊里的敌人），一幕爆发（命中处按脚下场地炸开：草木缠绕麻痹、水流冲推、地火灼伤、
 * 大地碎裂降防并顶开，踩不到地面时只剩普通冲击）。
 * 场地在施法者的脚下读取：换一块地面就等于换一招的结果。属性由 parameters.ts 的同一读取器在伤害 resolve 里给出，
 * 预览与命中同源；状态经共享 `hurt(...,{status,chance})` 落到任何活体，宝可梦的原生异常由共享库镜像。
 */
namespace PokemonSkills {
    const naturepowerScene = "world_combat:move_naturepower";

    /** 场地 → 属性、附加、推距倍率与音效。key 同时是粒子 moment 的后缀。 */
    export const naturepowerSites: { [key: string]: any } = {
        verdant: { key: "verdant", type: "grass", status: "paralysis", pushScale: 0.55, boostDef: false, ignite: false,
            sound: "cobblemon:impact.grass", text: "world_combat.move.naturepower.text.verdant" },
        water: { key: "water", type: "water", status: "", pushScale: 1.6, boostDef: false, ignite: false,
            sound: "cobblemon:impact.water", text: "world_combat.move.naturepower.text.water" },
        ember: { key: "ember", type: "fire", status: "burn", pushScale: 0.5, boostDef: false, ignite: true,
            sound: "cobblemon:impact.fire", text: "world_combat.move.naturepower.text.ember" },
        earth: { key: "earth", type: "rock", status: "", pushScale: 1.0, boostDef: true, ignite: false,
            sound: "cobblemon:impact.rock", text: "world_combat.move.naturepower.text.earth" },
        plain: { key: "plain", type: "normal", status: "", pushScale: 0.7, boostDef: false, ignite: false,
            sound: "cobblemon:impact.normal", text: "world_combat.move.naturepower.text.plain" }
    };

    function naturepowerVerdant(id: string, block: CombatBlock | null): boolean {
        var parts = ["grass", "leaves", "fern", "flower", "moss", "vine", "crop", "sapling", "azalea", "bush",
            "lily", "mushroom", "wheat", "carrot", "potato", "beetroot", "melon", "pumpkin", "cactus", "bamboo",
            "kelp", "seagrass", "sprout", "log", "wood", "dripleaf"];
        for (var i = 0; i < parts.length; i++) if (id.indexOf(parts[i]) >= 0) return true;
        return !!block && (block.tagged("minecraft:leaves") || block.tagged("minecraft:flowers") || block.tagged("minecraft:small_flowers")
            || block.tagged("minecraft:crops") || block.tagged("minecraft:saplings") || block.tagged("minecraft:replaceable_plants"));
    }

    /** 施法者站立处脚下的场地键：水／火／草木／大地，踩不到实体方块时为普通。 */
    export function naturepowerSiteAt(world: CombatWorld, foot: CombatPoint): string {
        var block = world.block(foot), id = block ? String(block.id()) : "";
        var fluid = world.fluid(foot);
        if (fluid && !fluid.empty() && (fluid.tagged("minecraft:water") || String(fluid.id()).indexOf("water") >= 0)) return "water";
        if (id.indexOf("water") >= 0 || id.indexOf("ice") >= 0 || id.indexOf("snow") >= 0) return "water";
        if (id.indexOf("fire") >= 0 || id.indexOf("lava") >= 0 || id.indexOf("magma") >= 0 || id.indexOf("campfire") >= 0) return "ember";
        if (naturepowerVerdant(id, block)) return "verdant";
        if (!block || id === "minecraft:air" || id.indexOf("void") >= 0) return "plain";
        return "earth";
    }

    function naturepowerFoot(body: CombatObservation): CombatPoint {
        var p = body.position();
        return WorldCombat.point(p.x(), p.y() - 1, p.z());
    }

    function naturepowerAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.8, 0)); }

    /** 一次命中：结算伤害与场地附加，播爆发画面，按场地顶推/降防/点燃。 */
    function naturepowerHit(current: CombatAction, target: CombatActor, site: any, power: number, chance: number, push: number, heading: CombatPoint, bursts: number): void {
        var world = current.world(), body = world.observe(target);
        if (!body) return;
        var before = body.health(), maximum = Math.max(1, body.maxHealth());
        var landed = hurt(current, target, naturepowerId, power,
            { status: site.status, chance: chance, knockback: false });
        var after = world.valid(target) ? world.observe(target) : null, dealt = before - (after ? after.health() : 0);
        if (landed) {
            if (site.ignite) world.ignite(target, 60);
            if (site.boostDef) NativeEffects.boost(world, target, "def", -1);
            if (push > 0 && world.valid(target)) world.displace(target, heading.scale(push * site.pushScale));
        }
        var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
        var point = body.position();
        world.sound(site.sound, point, 16, "{}");
        WorldFeedback.emit(world, naturepowerScene, 1, point,
            { moment: "burst_" + site.key, target: String(target.ref()), intensity: intensity,
                bursts: Math.round(bursts * (0.7 + intensity * 0.2)), scale: 1 }, 32);
        WorldFeedback.text(world, naturepowerAbove(point), site.text, [], 30);
    }

    /** 贴地涌动：地脉以 surgeSpeed 推进到 length，推进中扫过走廊，命中处按场地爆发。 */
    function naturepowerSurge(action: CombatAction, site: any, heading: CombatPoint, origin: CombatPoint, length: number, halfWidth: number, speed: number, power: number, chance: number, push: number, bursts: number, done: (current: CombatAction) => void): void {
        var groundY = origin.y();
        var travelled = 0, steps = 0, hitRefs: { [ref: string]: boolean } = Object.create(null);
        function step(current: CombatAction): void {
            var world = current.world();
            if (!world.valid(current.actor())) { done(current); return; }
            travelled = Math.min(length, travelled + speed);
            var head = WorldCombat.point(origin.x() + heading.x() * travelled, groundY, origin.z() + heading.z() * travelled);
            WorldFeedback.emit(world, naturepowerScene, 1, head,
                { moment: "surge_" + site.key, scale: Math.max(0.7, halfWidth / 0.8), bursts: Math.round(bursts * 0.5) }, 12);
            var lane = WorldGeometry.lane(origin, heading, Math.max(0.1, travelled), halfWidth);
            WorldGeometry.selectEnemies(world, lane, function (target) {
                var ref = String(target.ref());
                if (hitRefs[ref]) return;
                hitRefs[ref] = true;
                naturepowerHit(current, target, site, power, chance, push, heading, bursts);
            });
            steps++;
            if (travelled >= length - 0.01 || steps > 60) {
                WorldFeedback.emit(world, naturepowerScene, 1, head,
                    { moment: "burst_" + site.key, bursts: Math.round(bursts * 0.6), scale: Math.max(0.7, halfWidth / 0.8) }, 24);
                done(current);
                return;
            }
            current.after(2, step);
        }
        step(action);
    }

    define({
        id: naturepowerId, name: "自然之力",
        description: "把站立处的地面叫起来，化作一道贴地的地脉冲向目标：草木缠绕麻痹、水流冲推、地火灼伤、大地碎裂降防并顶开，其余地形只是一记普通冲击；换一块地面就等于换一招的结果。",
        uses: ["用脚下的地面决定属性", "在危险地形旁边借力", "催发一记更远更重的涌动"],
        kind: "enemy", range: 11, maxRange: 18, prepare: 0, active: 0, recover: 8, cooldown: 30, style: "naturepower",
        maximumTicks: 300,
        defaults: { charged: false },
        fields: [flag("charged", "催发地脉")],
        indicator: function () { return { radius: 11, geometry: "line", style: "naturepower", label: "自然之力" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[naturepowerId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.max(3, Math.round(p(naturepowerId, "windupTicks", context))),
                recover: 8, cooldown: Math.round(p(naturepowerId, "cooldown", context)), active: 0,
                range: p(naturepowerId, "reach", context) };
        },
        windup: function (action, _config, prepare) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            var site = "plain";
            if (body) site = naturepowerSiteAt(world, naturepowerFoot(body));
            action.present("naturepower:windup:" + action.id(), naturepowerScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", site: site, target: String(self.ref()) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var origin = body.position();
            var siteKey = naturepowerSiteAt(world, naturepowerFoot(body));
            var site: any = naturepowerSites[siteKey];
            var target = action.targetPosition();
            var flat = WorldCombat.point(target.x() - origin.x(), 0, target.z() - origin.z());
            var distance = flat.length();
            var heading = distance < 0.05 ? WorldCombat.point(action.direction().x(), 0, action.direction().z()) : flat.scale(1 / distance);
            if (heading.length() < 0.01) heading = WorldCombat.point(1, 0, 0);
            heading = heading.unit();
            var reach = p(naturepowerId, "reach", action);
            var length = Math.max(1.5, Math.min(reach, distance));
            var halfWidth = p(naturepowerId, "surgeWidth", action);
            var power = p(naturepowerId, "power", action);
            var chance = p(naturepowerId, "chance", action);
            var push = p(naturepowerId, "push", action);
            var bursts = Math.round(p(naturepowerId, "bursts", action));
            var speed = p(naturepowerId, "surgeSpeed", action);
            sound(action, "minecraft:block.rooted_dirt.break");
            naturepowerSurge(action, site, heading, origin, length, halfWidth, speed, power, chance, push, bursts, done);
        }
    });
}
