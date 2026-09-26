/**
 * 光合作用 / Synthesis —— 执行组织。
 *
 * 核心念头：摊开叶片，把此刻照到身上的光一口口合成生命；光越足，每一口越实，但整段吸收期间原地站定。
 *
 * 出手：共享节奏，stationary——短起手（随速度略短）后提交，PP 在提交时正常支付。
 * 过程：提交后进入原 soakTicks 的整段光合，均分成 4 次小回复：每次读当刻日照，按「单次 heal 比例 / 4」
 *   补一小口。固定上限是开始时缺血量，中途再挨打也不会把总预算撑大；阴影或天气变化会改变剩余几口的量。
 * 中断：整段站定且可被任何伤害打断；已到账的小回复保留，未完成的几口取消，叶片当刻合拢。
 * 表现：四片叶脉依次亮，只有真正回了血才有一颗绿光进入身体；日照低时叶脉与光点明显暗弱。
 */
namespace PokemonSkills {
    const synthesisScene = "world_combat:move_synthesis";
    const synthesisTextBloom = "world_combat.move.synthesis.text.bloom";
    const synthesisTextLow = "world_combat.move.synthesis.text.low";

    function synthesisAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.8, 0)); }

    /** 直接把一口世界单位生命补进身体：宝可梦经过 NativeEffects.heal（含受治疗加成），其他战斗者写 MC 生命。返回实际进账。 */
    function synthesisRestore(world: CombatWorld, self: CombatActor, amount: number): number {
        if (!(amount > 0) || !world.valid(self)) return 0;
        var before = world.observe(self);
        if (before === null) return 0;
        var bounded = Math.min(amount, Math.max(0, before.maxHealth() - before.health()));
        if (bounded <= 0) return 0;
        if (String(self.domain()) === "cobblemon" && world.valid(self)) {
            var pokemon = CobblemonCombat.pokemon(self), scale = Math.max(0.001, pokemon.healthScale());
            NativeEffects.heal(world, self, pokemon, bounded / scale, "synthesis");
        } else {
            world.health(self, bounded, "world_combat:synthesis");
        }
        var after = world.observe(self);
        return after ? Math.max(0, after.health() - before.health()) : 0;
    }

    define({
        id: synthesisId, name: "光合作用",
        description: "短起手后进入一段持续光合，把缺失生命均分成 4 次小回复逐口补回：每次读当刻日照，日照越足每口越实；整段站定，被打断则停止剩余几口、已到的回复保留。",
        uses: ["在阳光下逐口回一大截生命", "树荫里的小幅续命", "站定窗口里的自救"],
        kind: "self", range: 0, prepare: 0, active: 0, recover: 12, cooldown: 240, style: "photosynthesis",
        stationary: true, maximumTicks: 300,
        defaults: {},
        fields: [],
        indicator: function () { return { radius: 1, style: "photosynthesis", label: "光合作用" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[synthesisId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.max(4, Math.round(p(synthesisId, "prepareTicks", context))),
                recover: 12, cooldown: Math.max(60, Math.round(p(synthesisId, "cooldown", context))), active: 0, range: 0 };
        },
        ready: function (action) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            if (!body) return "invalid-target";
            if (body.health() >= body.maxHealth() - 0.01) return "nothing-to-restore";
            return "";
        },
        windup: function (action, _config, prepare) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            var light = body ? WorldEnvironment.sunlight(world, body.position()) : 0;
            action.present("synthesis:windup", synthesisScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", light: light, target: String(self.ref()) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var startMissing = Math.max(0, body.maxHealth() - body.health());
            var soak = Math.max(8, Math.round(p(synthesisId, "soakTicks", action)));
            var pulses = 4;
            var interval = Math.max(1, Math.floor(soak / pulses));
            var soakEnd = interval * pulses;
            var budget = startMissing;
            var healedTotal = 0, beat = 0, elapsed = 0, settled = false;
            // 持续光合期由一个 action-scoped 场景承载：每次 execute 自己创建，结束 finish、被打断 stop，叶片随之合拢。
            var scenes = WorldFeedback.actionScenes(synthesisScene, 1);

            function finishNow(current: CombatAction): void {
                if (settled) return;
                settled = true;
                var at = current.world().observe(self);
                if (at !== null) WorldFeedback.text(current.world(), synthesisAbove(at.position()),
                    healedTotal > 0 ? synthesisTextBloom : synthesisTextLow, [], 30);
                scenes.finish(current, done);
            }

            function step(current: CombatAction): void {
                if (settled) return;
                var scope = current.world();
                if (!scope.valid(self)) { finishNow(current); return; }
                var at = scope.observe(self);
                if (at === null) { finishNow(current); return; }
                // 整段光合保持站定，和准备/收招用同一套姿态规则。
                LivingActions.posture(current, { stationary: true });
                var light = WorldEnvironment.sunlight(scope, at.position());
                scenes.show(current, "soak", at.position(),
                    { moment: "soak", target: String(self.ref()), light: light, scale: 1 + light * 0.8 });
                elapsed++;
                if (beat < pulses && elapsed >= interval * (beat + 1)) {
                    var fraction = p(synthesisId, "heal", current) / pulses;
                    var want = Math.min(budget - healedTotal, startMissing * fraction);
                    var gained = synthesisRestore(scope, self, want);
                    healedTotal += gained;
                    beat++;
                    // 四片叶脉依次亮：每次 pick 对应的一片，日照低则更稀更小。
                    WorldFeedback.emit(scope, synthesisScene, 1, at.position(),
                        { moment: "vein", target: String(self.ref()), light: light, scale: 1 + light * 0.8,
                            s0: beat === 1 ? 0 : 30, s1: beat === 2 ? 0 : 30,
                            s2: beat === 3 ? 0 : 30, s3: beat === 4 ? 0 : 30,
                            motes: Math.max(3, Math.round(3 + light * 7)), petalSize: 0.09 + light * 0.09 }, 18);
                    if (gained > 0) {
                        // 只有真正进账了才落一颗绿光进身体。
                        WorldFeedback.emit(scope, synthesisScene, 1, at.position(),
                            { moment: "mote", target: String(self.ref()), light: light, scale: 1 + light * 0.6,
                                moteSize: 0.10 + Math.min(0.12, gained / Math.max(1, startMissing) * 0.6) }, 20);
                        feedback(scope, self, at.position(), "heal", { amount: Math.round(gained * 10) / 10 });
                    }
                }
                if (beat >= pulses && elapsed >= soakEnd) { finishNow(current); return; }
                current.after(1, step);
            }

            action.on("world_combat:interrupt", function (current: CombatAction) {
                if (settled) return;
                settled = true;
                try {
                    var scope = current.world();
                    scenes.stop(current);
                    var at = scope.observe(self);
                    if (at !== null) WorldFeedback.emit(scope, synthesisScene, 1, at.position(),
                        { moment: "close", target: String(self.ref()) }, 18);
                } catch (error) { /* the cancelled action may already have released its world handle */ }
            });

            world.sound("minecraft:block.moss.place", body.position(), 16, "{}");
            step(action);
        }
    });
}
