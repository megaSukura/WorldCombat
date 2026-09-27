/**
 * 回复指令 / Heal Order —— 执行组织。
 *
 * 核心念头：召来一队手下围着自己引导，每只把一份治疗带回来；打掉一只就少一份。
 *
 * 出手：共享节奏。windup 在身侧亮起召唤的光；提交后放出 count 只手下的持久实体（WorldBodies 脑
 *   world_combat:move/healorder/attendant，虫体 appearance），它们绕施法者飞、跟着走。
 * 结果：每只手下在 channelTicks 后回到施法者身边、且到本人有真实块通视时，才把一份治疗交回
 *   （总回复 = heal × 存活数 / 总数）。走散或被墙隔开、到点仍未归的手下不会远程送血；交付后自行收合散去。
 *   治疗反馈读交付前后世界的实际生命差，不是公式里写的份额。
 * 反制：引导期就是余地——对手可以集火手下来削减回复，或趁施法者还在引导时强攻；被杀的手下当场散落。
 */
namespace PokemonSkills {
    const healorderScene = "world_combat:move_healorder";
    const healorderAttendant = "world_combat:move/healorder/attendant";
    const healorderTextSummon = "world_combat.move.healorder.text.summon";
    const healorderTextSpent = "world_combat.move.healorder.text.spent";

    function healorderAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    /** 真实交付一份治疗；反馈与返回值都按世界里的前后生命差，而不是公式写的份额。 */
    function healorderHeal(world: CombatWorld, target: CombatActor, amount: number, cause: string): number {
        if (amount <= 0 || !world.valid(target)) return 0;
        var before = world.observe(target);
        if (before === null) return 0;
        var start = before.health();
        if (String(target.domain()) === "cobblemon") {
            var pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            NativeEffects.heal(world, target, pokemon, amount / scale, cause);
        } else {
            world.health(target, amount, "world_combat:" + cause);
        }
        var after = world.observe(target);
        var healed = after === null ? 0 : Math.max(0, after.health() - start);
        if (healed > 0 && after) feedback(world, target, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    function healorderState(brain: CombatEffect): any { return JSON.parse(brain.state()); }

    function healorderSchedule(brain: CombatEffect): void {
        var world = brain.world(), state = healorderState(brain), remaining = state.healAt - world.tick();
        brain.unschedule("healorder:deliver");
        brain.schedule("healorder:deliver", "deliver", Math.max(1, remaining), "{}");
    }

    function healorderHover(brain: CombatEffect): void {
        var world = brain.world(), state = healorderState(brain), self = world.observe(brain.target());
        if (!self) return;
        var owner = world.actor(state.owner), anchor = owner && world.valid(owner) ? world.observe(owner) : null;
        if (anchor) {
            var phase = state.phase + world.tick() * state.spin, radius = state.radius;
            var target = anchor.position().plus(WorldCombat.point(Math.cos(phase) * radius, state.hover, Math.sin(phase) * radius));
            var delta = target.minus(self.position()), length = delta.length();
            // 走散时加速回靠；被墙挡住就贴着墙推，不会穿墙瞬间归位。
            var speed = length > radius * 2 ? 0.9 : 0.5;
            if (length > 0.05) world.motion(brain.target(), delta.unit().scale(Math.min(speed, length)), false);
        }
        WorldFeedback.keep(world, "healorder:fly:" + String(brain.target().ref()), healorderScene, 1, self.position(),
            { moment: "channel", target: state.owner, scale: state.scale, size: 0.16 * state.scale }, 20);
    }

    /** 到点交付：只有真的回到本人身边、且到本人有块通视，才交这一份；否则原地散去，不远程送血。 */
    function healorderDeliver(brain: CombatEffect): void {
        var world = brain.world(), state = healorderState(brain), owner = world.actor(state.owner);
        if (owner && world.valid(owner)) {
            var body = world.observe(owner), self = world.observe(brain.target());
            if (body && body.health() < body.maxHealth() - 0.01 && self) {
                var near = self.position().minus(body.position()).length() <= state.radius + 1.2;
                if (near && world.clear(self.position(), body.position())) {
                    var before = body.health();
                    var healed = healorderHeal(world, owner, body.maxHealth() * state.share, "healorder");
                    var now = world.observe(owner);
                    var actual = now === null ? healed : Math.max(0, now.health() - before);
                    if (actual > 0) WorldFeedback.emit(world, healorderScene, 1, body.position(),
                        { moment: "deliver", target: String(owner.ref()), burst: Math.round(8 + actual * 2) }, 26);
                }
            }
        }
        brain.end();
    }

    function healorderEnd(brain: CombatEffect): void {
        var world = brain.world(), at = world.observe(brain.target());
        if (at) WorldFeedback.emit(world, healorderScene, 1, at.position(),
            { moment: brain.reason() === "died" ? "scatter" : "spent", target: String(brain.target().ref()) }, 20);
    }

    WorldBodies.define(healorderAttendant, {
        schema: 1,
        maxTicks: 400,
        start: function (brain) { healorderSchedule(brain); },
        resume: function (brain) { healorderSchedule(brain); },
        tick: { every: 2, handler: function (brain) { healorderHover(brain); } },
        handlers: { deliver: function (brain) { healorderDeliver(brain); } },
        end: function (brain) { healorderEnd(brain); }
    });

    define({
        id: healorderId, name: "回复指令",
        description: "召唤一队手下围着自己引导，片刻后每只回到身边、且到本人通视时交一份治疗给自己；走散或被墙隔开、到点仍未归的手下不送血，被打掉的手下少交一份并当场散落。全部幸存时回复最大生命的一半左右。",
        uses: ["快速续上一条命", "用可被击杀的手下把治疗拖成一个窗口", "在受击间隙里集体疗伤"],
        kind: "self", range: 0, prepare: 10, active: 0, recover: 14, cooldown: 200, style: "order", maximumTicks: 400,
        defaults: { elite: false },
        fields: [flag("elite", "精锐手下")],
        indicator: function (config) { return { radius: 1, style: "order", label: config.elite === true ? "精锐手下" : "虫群手下" }; },
        resolve: function (pokemon, config, world, actor) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[healorderId], detail: { values: config }, world: world || null, actor: actor || null };
            return { prepare: p(healorderId, "prepare", context), recover: p(healorderId, "recover", context), cooldown: p(healorderId, "cooldown", context), active: 0, range: 0 };
        },
        ready: function (action) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            if (!body) return "invalid-target";
            if (body.health() >= body.maxHealth() - 0.01) return "nothing-to-restore";
            return "";
        },
        windup: function (action, _config, prepare) {
            action.present("healorder:windup", healorderScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(action.actor().ref()) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var elite = config.elite === true;
            var count = Math.max(1, Math.round(p(healorderId, "attendants", action)));
            if (elite) count = Math.max(1, Math.round(count * 0.6));
            var health = Math.max(1, Math.round(p(healorderId, "attendantHealth", action)));
            var channel = Math.max(5, Math.round(p(healorderId, "channelTicks", action)));
            var radius = p(healorderId, "orbitRadius", action);
            var hover = 0.4 + body.height() * 0.2;
            var share = p(healorderId, "heal", action) / count;
            var scale = elite ? 1.4 : 1;
            for (var i = 0; i < count; i++) {
                var angle = i * (Math.PI * 2 / count);
                var point = body.position().plus(WorldCombat.point(Math.cos(angle) * radius, hover, Math.sin(angle) * radius));
                WorldBodies.spawn(world, point, {
                    appearance: { sprite: "cobblemon:generic/flying_bugs", scale: elite ? 1.1 : 0.85, tint: 0xF2C14E, glow: true },
                    size: elite ? [0.6, 0.6] : [0.4, 0.4], health: health, gravity: false,
                    pushable: false, invulnerable: false, silent: true, knockbackResistance: 0.5
                }, healorderAttendant,
                    { owner: String(self.ref()), share: share, healAt: world.tick() + channel,
                        phase: angle, spin: 0.08, radius: radius, hover: hover, scale: scale }, channel + 80);
            }
            sound(action, "minecraft:block.beehive.enter");
            WorldFeedback.emit(world, healorderScene, 1, body.position(),
                { moment: "summon", target: String(self.ref()), count: count, burst: count * 8, scale: scale }, 30);
            WorldFeedback.text(world, healorderAbove(body.position()), healorderTextSummon, [], 30);
            done(action);
        }
    });
}
