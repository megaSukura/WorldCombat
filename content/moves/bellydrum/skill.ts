namespace PokemonSkills {
    const bellydrumScene = "world_combat:move_bellydrum";
    const bellydrumEffect = "world_combat:bellydrum";
    const bellydrumTextSurge = "world_combat.move.bellydrum.text.surge";
    const bellydrumTextFade = "world_combat.move.bellydrum.text.fade";
    const bellydrumTextUnpaid = "world_combat.move.bellydrum.text.unpaid";
    /** 表现里的参考体型：`data.scale = 实际身体宽度 / 这个数`。 */
    const bellydrumReferenceWidth = 0.9;

    function bellydrumAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.9, 0)); }

    /** 准备期的腹前拍点：用真实朝向与身体宽高，让每一记敲击都落在肚皮正面。 */
    function bellydrumBellyPoint(world: CombatWorld, actor: CombatActor): { point: CombatPoint; forward: CombatPoint; scale: number } | null {
        var body = world.observe(actor);
        if (!body) return null;
        var forward = WorldGeometry.flatUnit(WorldGeometry.facing(world, actor) || WorldCombat.point(0, 0, 1));
        return {
            point: body.position().plus(forward.scale(body.width() * 0.5 + 0.12)).plus(WorldCombat.point(0, -body.height() * 0.12, 0)),
            forward: forward,
            scale: Math.max(0.6, Math.min(2, body.width() / bellydrumReferenceWidth))
        };
    }

    WorldCombat.on("world_combat:bellydrum/fade", "world_combat:mob_effect_removed", "", function (event) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== bellydrumEffect) return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        var body = world.observe(actor);
        if (body) {
            WorldFeedback.emit(world, bellydrumScene, 1, body.position(),
                { moment: "fade", target: String(actor.ref()), beats: Math.max(1, Math.round(Number(data.amplifier) || 1)) }, 26);
            WorldFeedback.text(world, bellydrumAbove(body.position()), bellydrumTextFade, [], 26);
        }
    });

    define({
        id: bellydrumId, name: "腹鼓",
        description: "拍响腹鼓，把自己的生命压到一条底线，换取满级物攻；力量维持一段可见的窗口，窗口结束或提前被清除时会收回那些能力等级。生命低于那条底线时无法起鼓。",
        uses: ["把生命换成爆发物攻", "在开战前把物攻拉满", "用可见的力量窗口逼对手做取舍"],
        kind: "self", range: 0, prepare: 14, active: 0, recover: 12, cooldown: 300, style: "drum", maximumTicks: 400,
        defaults: { endure: false },
        fields: [flag("endure", "持久鼓劲")],
        indicator: function (config) { return { radius: 1, style: "drum", label: config.endure === true ? "持久鼓劲" : "爆发鼓劲" }; },
        resolve: function (pokemon, config, world, actor) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[bellydrumId], detail: { values: config }, world: world || null, actor: actor || null };
            return {
                prepare: Math.round(p(bellydrumId, "drumPrepare", context)),
                recover: Math.round(p(bellydrumId, "drumRecover", context)),
                cooldown: Math.round(p(bellydrumId, "cooldown", context)),
                active: 0, range: 0
            };
        },
        ready: function (action) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            if (!body) return "invalid-target";
            if(NativeEffects.effectiveStage(world,self,"atk")>=6)return "no-benefit";
            var keep = p(bellydrumId, "keep", action);
            if (body.health() <= body.maxHealth() * keep + 0.5) return "too-weak";
            return "";
        },
        windup: function (action, _config, prepare) {
            var prepareTicks = Math.max(1, Math.round(prepare));
            // 准备期内敲 3–5 记腹鼓，拍数随（由体重派生的）准备时长而定；末拍之后才提交支付与增益。
            var taps = Math.max(3, Math.min(5, Math.round(prepareTicks / 5)));
            function drum(current: CombatAction, index: number): void {
                var at = bellydrumBellyPoint(current.sense(), current.actor());
                if (!at) return;
                current.present("bellydrum:tap/" + index, bellydrumScene, 1, at.point,
                    JSON.stringify({ moment: "tap", target: String(current.actor().ref()), beat: index + 1, beats: taps,
                        direction: [at.forward.x(), at.forward.y(), at.forward.z()], scale: at.scale }));
            }
            drum(action, 0);
            for (var index = 1; index < taps; index++) {
                (function (beatIndex) {
                    action.after(Math.max(1, Math.round(beatIndex * prepareTicks / taps)), function (current) { drum(current, beatIndex); });
                })(index);
            }
            return prepare;
        },
        execute: function (action, _move, config, done) {
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var keep = p(bellydrumId, "keep", action), target = Math.max(1, Math.min(6, Math.round(p(bellydrumId, "stages", action))));
            var floor = Math.max(1, body.maxHealth() * keep);
            var due = Math.max(0, body.health() - floor);
            // 支付走原生结算并读取真实负变化：原生拒绝时不得无代价拿到满攻。
            var paid = due > 0 ? world.payHealth(due, "world_combat:bellydrum", floor) : 0;
            if (!(due > 0) || paid + 1e-4 < due) {
                sound(action, "minecraft:block.note_block.bass");
                WorldFeedback.text(world, bellydrumAbove(body.position()), bellydrumTextUnpaid, [], 26);
                done(action); return;
            }
            var reached = target;
            var previous = MobEffects.read(world, self, bellydrumEffect);
            var surge = Math.max(20, Math.round(p(bellydrumId, "surgeTicks", action)));
            var carrier = MobEffects.apply(world, self, bellydrumEffect, surge, 0);
            var windowId = carrier ? NativeEffects.boostWindowTo(world, self, { atk: reached }, surge, "bellydrum", carrier, previous) : 0;
            var actual = NativeEffects.effectiveStage(world, self, "atk");
            if (!windowId) {
                if (carrier) world.removeMobEffect(self, carrier.id(), carrier.key());
                sound(action, "minecraft:block.note_block.bass");
                WorldFeedback.text(world, bellydrumAbove(body.position()), bellydrumTextUnpaid, [], 26);
                done(action); return;
            }
            WorldFeedback.onEffect(world, windowId, "world_combat:move_bellydrum/hold", bellydrumScene, 1,
                body.position(), { moment: "hold", target: String(self.ref()), beats: Math.max(1, Math.abs(actual)), glow: 3, duration: surge });
            sound(action, "minecraft:block.note_block.bass");
            WorldFeedback.emit(world, bellydrumScene, 1, body.position(),
                { moment: "surge", target: String(self.ref()), beats: Math.max(1, actual), burst: Math.max(1, actual) * 10,
                    paidRatio: body.maxHealth() > 0 ? paid / body.maxHealth() : 0 }, 34);
            WorldFeedback.text(world, bellydrumAbove(body.position()), bellydrumTextSurge, [actual], 30);
            done(action);
        }
    });
}
