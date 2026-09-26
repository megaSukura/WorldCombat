/** Native two-body swap with success-only target requests and brief endpoint refraction. */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: allySwitchId,
        cooldownParameter: "wait",
        name: "交换场地",
        description: "与范围内同伴真实交换位置，接替危险站位或让自己撤出。两端必须容身；成功后才请求追兵对调目标，原生拒绝时保留换位本身。",
        uses: ["被贴住时与同伴对调，把这一下引到别人身上", "把残血的自己换到同伴背后", "把正盯着我的敌人改成盯着同伴"],
        kind: "friend",
        range: 6,
        maxRange: 11,
        prepare: 4,
        active: 1,
        recover: 5,
        cooldown: 70,
        style: "shift",
        stationary: false,
        defaults: { tandem: false, ai: { maxChase: 14, retreatBelow: 0.4 } },
        fields: [flag("tandem", "同调")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(allySwitchId, "swapRange", pokemon) : 6, geometry: "area", style: "shift",
                color: 0x7FD8FF, label: config && config.tandem === true ? "交换场地 · 同调" : "交换场地" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[allySwitchId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(allySwitchId, "tempo", context)),
                recover: Math.round(p(allySwitchId, "aftercast", context)),
                cooldown: Math.round(p(allySwitchId, "wait", context)),
                active: 1,
                range: p(allySwitchId, "swapRange", context)
            };
        },
        ready: function (action, _config) {
            const target = action.target();
            if (target === null) return "invalid-target";
            if (String(target.ref()) === String(action.actor().ref())) return "no-partner";
            if (!action.sense().friendly(target)) return "invalid-target";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_allyswitch:fold", allySwitchScene, 1, action.origin(),
                JSON.stringify({ moment: "fold", tandem: config && config.tandem === true ? 1 : 0 }));
            const target = action.target(), facts = target && action.sense().observe(target);
            if (facts) action.present("world_combat:move_allyswitch:partner", allySwitchScene, 1, facts.position(), JSON.stringify({ moment: "partner" }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), ally = action.target();
            if (ally === null || !world.valid(ally) || !world.friendly(ally) || String(ally.ref()) === String(self.ref())) { done(action); return; }
            const selfBody = world.observe(self), allyBody = world.observe(ally);
            if (selfBody === null || allyBody === null) { done(action); return; }
            const selfFrom = selfBody.position(), allyFrom = allyBody.position();
            if (selfFrom.minus(allyFrom).length() > p(allySwitchId, "swapRange", action)) {
                WorldFeedback.emit(world, allySwitchScene, 1, selfFrom, { moment: "fizzle" }, 10);
                done(action); return;
            }
            const motes = Math.max(8, Math.round(p(allySwitchId, "motes", action)));
            const sweep = Math.max(1, p(allySwitchId, "sweep", action));
            const blink = Math.max(4, Math.round(p(allySwitchId, "blink", action)));
            const scale = Math.max(0.6, Math.min(1.8, motes / 24));
            const selfRef = String(self.ref()), allyRef = String(ally.ref());
            const center = selfFrom.plus(allyFrom).scale(0.5);

            // 换位前先记下盯着两人的敌人；换位后再把这些目标对调。
            const near = world.query(center, sweep, false);
            const chasingSelf: CombatActor[] = [], chasingAlly: CombatActor[] = [];
            for (let index = 0; index < near.length; index++) {
                const other = near[index];
                if (world.friendly(other)) continue;
                const facts = world.observe(other);
                if (facts === null || facts.health() <= 0) continue;
                const chasing = facts.attacking();
                if (chasing === null) continue;
                const ref = String(chasing.ref());
                if (ref === selfRef) chasingSelf.push(other);
                else if (ref === allyRef) chasingAlly.push(other);
            }

            const swapped = world.swap(self, ally);
            if (!swapped) {
                WorldFeedback.emit(world, allySwitchScene, 1, center, { moment: "fizzle" }, 10);
                WorldFeedback.text(world, center, allySwitchFizzleText, [], 18);
                done(action); return;
            }
            let misled = 0;
            if (swapped) {
                for (let index = 0; index < chasingSelf.length; index++) {
                    const other = chasingSelf[index];
                    if (world.valid(other) && world.valid(ally) && world.target(other, ally)) misled++;
                }
                for (let index = 0; index < chasingAlly.length; index++) {
                    const other = chasingAlly[index];
                    if (world.valid(other) && world.valid(self) && world.target(other, self)) misled++;
                }
            }

            WorldFeedback.emit(world, allySwitchScene, 1, center,
                { moment: "swap", path: [[selfFrom.x(), selfFrom.y(), selfFrom.z()], [allyFrom.x(), allyFrom.y(), allyFrom.z()]],
                    target: allyRef, motes: motes, misled: misled,
                    swapped: swapped ? 1 : 0, scale: scale, intensity: Math.max(0.7, Math.min(1.8, 0.7 + misled / 3)) }, 26);
            WorldFeedback.emit(world, allySwitchScene, 1, selfFrom, { moment: "arrival", motes: motes }, blink);
            WorldFeedback.emit(world, allySwitchScene, 1, allyFrom, { moment: "arrival", motes: motes }, blink);
            WorldFeedback.text(world, center.plus(WorldCombat.point(0, 1.25, 0)),
                swapped ? allySwitchSwapText : allySwitchFizzleText, swapped ? [misled] : [], 28);
            world.sound("minecraft:entity.illusioner.mirror_move", selfFrom, 14, "{}");
            world.sound("minecraft:entity.enderman.teleport", center, 14, "{}");
            done(action);
        }
    });
}
