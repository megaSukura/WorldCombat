namespace CompanionBehavior {
        /** Base threat qualification plus the authored ordering contributions; hidden subjects never qualify (visible is false). */
        function threatCandidate(context: WorldBehavior.Context, self: Entity, defended: Entity, other: Entity): ThreatCandidate {
            var justHurt = function (subject: Entity): boolean { return typeof subject.hurtAgo === "number" && subject.hurtAgo < 100; };
            var qualifies = other.ref === context.facts.focus || other.ref === self.attacking || other.hostile
                || other.attacking === self.ref || other.attacking === defended.ref
                || justHurt(self) && self.lastAttacker === other.ref
                || justHurt(defended) && defended.lastAttacker === other.ref;
            var score = distance(other.point, defended.point);
            if (other.ref === context.facts.focus) score -= 1000;
            if (other.attacking === defended.ref || other.attacking === self.ref) score -= 100;
            var candidate: ThreatCandidate = { context: context, self: self, defended: defended, subject: other, qualifies: qualifies, score: score };
            threatBias(candidate);
            return candidate;
        }
        registry.sense({ id: "world_combat:threat", read: function (context) {
                var facts = context.facts, self = source(context);
                var defended: Entity = entity(context, facts.protect) || facts.owner || self;
                var candidates = (facts.nearby as Entity[]).filter(function (other) {
                    if (!other.visible || other.friendly || other.health <= 0 || other.ref === facts.capture)
                        return false;
                    if (other.ref !== facts.focus && distance(other.point, facts.anchor) > facts.range)
                        return false;
                    return threatCandidate(context, self, defended, other).qualifies;
                });
                candidates.sort(function (a, b) {
                    return threatCandidate(context, self, defended, a).score - threatCandidate(context, self, defended, b).score;
                });
                return candidates[0] || null;
            } });
        registry.sense({ id: "world_combat:movement", read: function (context) { return WorldMethods.motion(context, "observedMotion"); } });
        registry.sense({ id: "world_combat:patient", after: ["world_combat:threat"], read: function (context) {
                var self = source(context), patients: Entity[] = [self];
                var mayHelp = WorldBehavior.capabilities(context, "world_combat:heal").some(function (item) { return item.data.config.helpFriends; });
                if (mayHelp)
                    patients = patients.concat((context.facts.nearby as Entity[]).filter(function (other) {
                        return other.friendly && other.health > 0 && distance(other.point, context.facts.anchor) <= context.facts.range;
                    }));
                // A heal-capable use decides whether a full-health ally still needs it (a curable status), so accept the target it accepts.
                return WorldMethods.search(context, patients, function (candidate) { return candidate.health > 0 && options(context, "world_combat:heal", candidate).length > 0; }, function (a, b) { return ratio(a) - ratio(b) || distance(a.point, self.point) - distance(b.point, self.point); });
            } });
        registry.sense({ id: "world_combat:ward", after: ["world_combat:threat"], read: function (context) {
                var threat: Entity | null = context.senses["world_combat:threat"], self = source(context);
                if (!threat)
                    return null;
                var maySelf = WorldBehavior.capabilities(context, "world_combat:shield").some(function (item) { return item.data.config.allowSelf; });
                return WorldMethods.search(context, (context.facts.nearby as Entity[]).concat(maySelf ? [self] : []), function (other) {
                    return other.friendly && other.health > 0 && distance(other.point, context.facts.anchor) <= context.facts.range
                        && (threat!.attacking === other.ref || other.hurtAgo < 60 || ratio(other) < 0.65 && distance(other.point, threat!.point) < 8);
                }, function (a, b) { return ratio(a) - ratio(b); });
            } });
        registry.sense({ id: "world_combat:partner", after: ["world_combat:threat"], read: function (context) {
                var self = source(context), threat = context.senses["world_combat:threat"];
                var maySelf = WorldBehavior.capabilities(context, "world_combat:bolster").some(function (item) { return item.data.config.allowSelf; });
                var attendInjured = WorldBehavior.capabilities(context, "world_combat:bolster").some(item => ai<string>(item, "prefer", "engaged") === "injured");
                return WorldMethods.search(context, (context.facts.nearby as Entity[]).concat(maySelf ? [self] : []), function (other) {
                    return other.friendly && other.health > 0 && other.visible && (attendInjured && ratio(other) < .95 || (threat ? !!other.attacking || other.hurtAgo < 60
                        : distance(other.point, self.point) > 4 || other.ref === self.ref && distance(self.point, context.facts.anchor) > 5));
                }, function (a, b) { return distance(a.point, self.point) - distance(b.point, self.point); });
            } });
        registry.policy({ id: "world_combat:individual", prepare: function (context) {
                var facts = context.facts, risk = BehaviorProfiles.value(context, "risk", 0);
                context.scratch.cautious = risk <= -0.1;
                context.scratch.close = facts.attack / Math.max(1, facts.specialAttack) + BehaviorProfiles.value(context, "meleeBias", 0) >= 1.12;
                context.scratch.curious = BehaviorProfiles.value(context, "curiosity", 0) >= .4;
                context.scratch.retreatHealth = Math.max(.1, Math.min(.65, .28 - risk));
                context.scratch.warningWait = Math.max(2, BehaviorProfiles.value(context, "warningPatience", 24));
            } });
        registry.goal({ id: "world_combat:goals", propose: function (context) {
                var facts = context.facts, threat: Entity | null = context.senses["world_combat:threat"], patient: Entity | null = context.senses["world_combat:patient"];
                var goals: WorldBehavior.Goal[] = [{ id: "command:" + facts.intent, kind: "world_combat:command", data: {} }];
                if (facts.intent === "hold")
                    return goals;
                if (threat) {
                    goals.push({ id: "defend:" + threat.ref, kind: "world_combat:defend", data: { ref: threat.ref } });
                    if (fleeing(context, threat) && !protectedControl(threat) && !threat.revealed)
                        goals.push({ id: "track:" + threat.ref, kind: "world_combat:track", data: { ref: threat.ref } });
                    if (facts.intent === "work" || ratio(source(context)) < context.scratch.retreatHealth)
                        goals.push({ id: "retreat:" + threat.ref, kind: "world_combat:retreat", data: { ref: threat.ref } });
                }
                if (patient)
                    goals.push({ id: "care:" + patient.ref, kind: "world_combat:care", data: { ref: patient.ref } });
                if (threat && ready(context, "world_combat:survive", source(context)).length)
                    goals.push({ id: "survive", kind: "world_combat:survive", data: { ref: source(context).ref } });
                if (threat && ready(context, "world_combat:cover", source(context)).length)
                    goals.push({ id: "cover", kind: "world_combat:cover", data: { ref: source(context).ref } });
                var ward: Entity | null = context.senses["world_combat:ward"], partner: Entity | null = context.senses["world_combat:partner"];
                if (ward)
                    goals.push({ id: "shield:" + ward.ref, kind: "world_combat:shield", data: { ref: ward.ref } });
                if (partner)
                    goals.push({ id: "assist:" + partner.ref, kind: threat ? "world_combat:bolster" : "world_combat:travel-help", data: { ref: partner.ref } });
                if (ready(context, "world_combat:fortify", source(context)).length)
                    goals.push({ id: "fortify", kind: "world_combat:fortify", data: { ref: source(context).ref } });
                if (threat && ready(context, "world_combat:drain", threat).some(function (item) { return drainNeeded(context, item); }))
                    goals.push({ id: "drain:" + threat.ref, kind: "world_combat:drain", data: { ref: threat.ref } });
                var work = context.memory.worksite;
                if (worksites.supports(context) && (!work || work.job || context.tick >= work.next))
                    goals.push({ id: "worksite", kind: "world_combat:worksite", data: {} });
                var observing = WorldBehavior.continuing(context, choice => choice.method.id === "world_combat:observe");
                if (!threat && context.scratch.curious && (observing || facts.wild && facts.restFor >= 40 || facts.intent === "work" || facts.intent === "autonomous")) {
                    var visitor = (facts.nearby as Entity[]).filter(function (other) {
                        return other.visible && !other.friendly && !other.hostile && other.health > 0 && distance(other.point, source(context).point) <= 10
                            && (observing || !recent(context, "observe", other.ref, 600));
                    })[0];
                    if (visitor)
                        goals.push({ id: "observe:" + visitor.ref, kind: "world_combat:observe", data: { ref: visitor.ref } });
                }
                // Preparation is a goal in combat too; each move's own `available`/`priority` decides whether it matters now.
                if (threat ? ready(context, "world_combat:prepare", source(context)).length > 0 : distance(source(context).point, facts.anchor) <= (facts.intent === "work" || facts.intent === "stay" ? 3 : 5))
                    goals.push({ id: "prepare", kind: "world_combat:prepare", data: { ref: source(context).ref } });
                return goals;
            } });
        registry.method({ id: "world_combat:continuous-command", propose: function (_context, goal) {
                return goal.kind === "world_combat:command" ? [{ id: "travel", data: {} }] : [];
            }, create: function (context, _choice) {
                if (context.facts.intent === "hold")
                    return tasks.hold("hold");
                if (context.facts.intent === "autonomous")
                    return tasks.wander(function (current) { return current.facts.owner ? current.facts.owner.point : current.facts.anchor; }, "autonomous", { maxRadius: current => Math.max(2, BehaviorProfiles.value(current, "explorationRadius", 5)), minPauseTicks: current => Math.max(20, BehaviorProfiles.value(current, "explorationPause", 80)), maxPauseTicks: current => Math.max(40, BehaviorProfiles.value(current, "explorationPause", 160)) });
                if (context.facts.intent === "focus")
                    return WorldBehavior.step(function (current) {
                        var target = entity(current, current.facts.focus), reason = current.facts.focusIssue;
                        if (!reason && target && protectedControl(target))
                            reason = "control-preserved";
                        if (!reason)
                            reason = current.capabilities.some(function (item) {
                                return item.data.pp > 0 && item.protocols.some(function (protocol) {
                                    return ["world_combat:attack", "world_combat:control", "world_combat:reveal"].indexOf(protocol) >= 0;
                                });
                            }) ? "skill-unavailable" : "no-usable-skill";
                        stopMovement(current);
                        note(current, "blocked", "world_combat:" + reason);
                        return WorldBehavior.running();
                    }, { exit: stopMovement });
                return travelNode(function (context) { return context.facts.anchor; }, 2.2, "attending", true);
            } });
        tasks.method(registry, { id: "world_combat:track", protocol: "world_combat:reveal", purpose: "reveal", target: goalEntity,
            matches: function (context, goal) { return goal.kind === "world_combat:track" && !recent(context, "reveal", goal.data.ref, 40); },
            filter: function (context, item, goal) { var target = entity(context, goal.data.ref); return !!target && stationAllows(context, item, "reveal", target); }
        });
        registry.method({ id: "world_combat:worksite", propose: function (_context, goal) {
                return goal.kind === "world_combat:worksite" ? [{ id: "cycle", data: {} }] : [];
            }, create: function () { return tasks.work(worksites, "worksite"); } });
        registry.method({ id: "world_combat:observe", propose: function (_context, goal) {
                return goal.kind === "world_combat:observe" ? [{ id: "approach-and-watch", data: {} }] : [];
            }, create: function (context) { return tasks.observe(goalEntity, Math.max(2, BehaviorProfiles.value(context, "socialDistance", 4)), 20, "curious"); } });
        ["shield", "survive", "bolster", "travel-help", "fortify", "drain", "cover"].forEach(function (purpose) {
            tasks.method(registry, { id: "world_combat:" + purpose, protocol: "world_combat:" + purpose, purpose: purpose,
                matches: function (_context, goal) { return goal.kind === "world_combat:" + purpose; },
                filter: function (context, item) { return purpose !== "drain" || drainNeeded(context, item); },
                target: function (context) {
                    var target = goalEntity(context);
                    if (purpose !== "cover" || !target)
                        return target;
                    var copy: Entity = JSON.parse(JSON.stringify(target)), threat: Entity | null = context.senses["world_combat:threat"];
                    if (ai<string>(context.choice!.offer.capabilities![0], "placement", "towardThreat") === "nearOwner" && context.facts.owner) {
                        var owner = context.facts.owner; copy.point = target.point.map((value, i) => value + (owner.point[i] - value) / Math.max(1, distance(target!.point, owner.point)) * Math.min(1.5, distance(target!.point, owner.point)));
                    } else if (threat) {
                        var length = distance(target.point, threat.point) || 1;
                        copy.point = target.point.map(function (value, i) { return value + (threat!.point[i] - value) / length * Math.min(1.5, length); });
                    }
                    return copy;
                }
            });
        });
        registry.method({ id: "world_combat:retreat", propose: function (_context, goal) {
                return goal.kind === "world_combat:retreat" ? [{ id: "seek-space", data: {} }] : [];
            }, create: function () { return tasks.withdraw(goalEntity, function (context) { return context.facts.owner; }, constrained); } });
        tasks.method(registry, { id: "world_combat:care", protocol: "world_combat:heal", purpose: "care", target: goalEntity,
            matches: function (_context, goal) { return goal.kind === "world_combat:care"; },
            filter: function (context, item, goal) {
                var target = entity(context, goal.data.ref);
                if (!target || goal.data.ref !== source(context).ref && !item.data.config.helpFriends) return false;
                return ratio(target) < ai(item, "healBelow", .82) || uses.available(context, item, "care", target);
            }
        });
        tasks.method(registry, { id: "world_combat:prepare", protocol: "world_combat:prepare", purpose: "prepare", target: source,
            matches: function (_context, goal) { return goal.kind === "world_combat:prepare"; }
        });
        registry.method({ id: "world_combat:engage", propose: function (context, goal) {
                if (goal.kind !== "world_combat:defend")
                    return [];
                var threat = entity(context, goal.data.ref);
                if (!threat)
                    return [];
                var attacks = ready(context, "world_combat:attack", threat).filter(function (item) {
                    return stationAllows(context, item, "attack", threat!);
                }), controls = ready(context, "world_combat:control", threat).filter(function (item) { return stationAllows(context, item, "control", threat!); });
                if (!attacks.length) return [];
                var warning = ready(context, "world_combat:warning", threat).filter(function (item) {
                    return item.data.config.warnBeforeAttack && stationAllows(context, item, "warning", threat!)
                        && distance(source(context).point, threat!.point) <= castRange(context, item, "warning") + 2;
                });
                return attacks.map(function (attack) {
                    var control = controls.filter(function (item) { return item.id !== attack.id && item.protocols.indexOf("world_combat:warning") < 0; })[0];
                    var combination = combinations[attack.data.move], preparation = combination && combination.prepare(context, attack, threat!, controls);
                    var usePreparation = !!preparation && preparation.requested;
                    if (preparation && preparation.control)
                        control = preparation.control;
                    var warn = warning[0], useWarning = warn && !context.facts.focus && source(context).hurtAgo >= 60
                        && !recent(context, "warning", threat!.ref, 300);
                    var useControl = control && !recent(context, "control", threat!.ref, 160)
                        && (usePreparation || context.scratch.cautious || distance(threat!.point, source(context).point) < 6 || threat!.attacking);
                    var plan = [attack];
                    if (useWarning)
                        plan.push(warn);
                    if (useControl)
                        plan.push(control);
                    return { id: attack.id, capabilities: plan, data: { warning: useWarning ? warn.id : "", control: useControl ? control.id : "",
                            combination: usePreparation && useControl && preparation && preparation.wait ? attack.data.move : "" } };
                });
            }, create: function (context, choice) {
                var nodes: WorldBehavior.Node[] = [], data = choice.offer.data;
                if (data.warning) {
                    nodes.push(castNode(data.warning, "warning", goalEntity));
                    nodes.push(WorldBehavior.waitTicks(context.scratch.warningWait));
                }
                if (data.control)
                    nodes.push(castNode(data.control, "control", goalEntity));
                if (data.combination && combinations[data.combination])
                    nodes.push(combinations[data.combination].wait(context));
                nodes.push(castNode(choice.offer.capabilities![0].id, "attack", goalEntity));
                return WorldBehavior.sequence(nodes);
            } });
        registry.method({ id: "world_combat:control-only", propose: function (context, goal) {
                if (goal.kind !== "world_combat:defend")
                    return [];
                var threat = entity(context, goal.data.ref);
                if (!threat)
                    return [];
                // Control participates alongside attacks; its own priority decides the order instead of being suppressed by a ready attack.
                return ready(context, "world_combat:control", threat).filter(function (item) {
                    return stationAllows(context, item, "control", threat!) && !recent(context, "control", goal.data.ref, 100);
                })
                    .map(function (item) { return { id: item.id, data: {}, capabilities: [item] }; });
            }, create: function (_context, choice) { return castNode(choice.offer.capabilities![0].id, "control", goalEntity); } });
        function choicePriority(context: WorldBehavior.Context, choice: WorldBehavior.Choice): number {
            var item = choice.offer.capabilities && choice.offer.capabilities[0];
            var target = choice.goal.data && typeof choice.goal.data.ref === "string" ? entity(context, choice.goal.data.ref) : null;
            return item ? uses.priority(context, item, target) : 0;
        }
        registry.policy({ id: "world_combat:task-order", choices: function (context, choices) {
                return choices.sort(function (a, b) {
                    if (a.goal.kind !== b.goal.kind) return 0;
                    var ownPriority = choicePriority(context, b) - choicePriority(context, a);
                    if (ownPriority) return ownPriority;
                    if (a.goal.kind !== "world_combat:defend") return 0;
                    var first = a.offer.capabilities && a.offer.capabilities[0], second = b.offer.capabilities && b.offer.capabilities[0];
                    if (!first || !second)
                        return 0;
                    var target = entity(context, a.goal.data.ref), firstRule = combinations[first.data.move], secondRule = combinations[second.data.move];
                    var firstPriority = firstRule ? firstRule.priority(context, first, target) : 0, secondPriority = secondRule ? secondRule.priority(context, second, target) : 0;
                    if (firstPriority !== secondPriority)
                        return secondPriority - firstPriority;
                    var last = context.memory.events || {}, aRecent = last["move:" + first.data.move] || -10000, bRecent = last["move:" + second.data.move] || -10000;
                    if (aRecent !== bRecent)
                        return aRecent - bRecent;
                    var persistence = BehaviorProfiles.value(context, "persistence", 0);
                    if (context.active && persistence > .1) { if (a.key === context.active.key) return -1; if (b.key === context.active.key) return 1; }
                    return context.scratch.close ? first.data.range - second.data.range : second.data.range - first.data.range;
                });
            }, decide: function (context, choices, decision) {
                var activeChoice = context.active && choices.some(choice => choice.key === context.active!.key) ? context.active : null;
                var holding = activeChoice && tasks.running(context, activeChoice);
                // Explicit urgency crosses goal order; ordinary priority orders eligible uses within a purpose.
                var urgent = choices.map(function (choice) {
                    return { choice: choice, priority: choicePriority(context, choice) };
                }).filter(function (entry) {
                    return entry.priority >= 100 && (holding && entry.choice.key === activeChoice!.key || uses.readyChoice(context, entry.choice));
                }).sort(function (a, b) { return b.priority - a.priority; })[0];
                if (urgent) return { key: urgent.choice.key, transition: "suspend" };
                if (holding) return { key: activeChoice!.key };
                var patient: Entity | null = context.senses["world_combat:patient"], threat: Entity | null = context.senses["world_combat:threat"];
                var order: string[] = [];
                order.push("world_combat:survive", "world_combat:shield", "world_combat:cover");
                if (patient && patient.ref === source(context).ref && ratio(patient) < 0.4 && threat && distance(patient.point, threat.point) >= 8)
                    order.push("world_combat:care");
                if (threat && distance(source(context).point, threat.point) >= 8)
                    order.push("world_combat:drain");
                order.push("world_combat:retreat");
                if (patient && ratio(patient) < 0.4 && !context.facts.focus)
                    order.push("world_combat:care");
                if (threat)
                    order.push("world_combat:bolster", "world_combat:drain", "world_combat:track", "world_combat:defend");
                order.push("world_combat:care", "world_combat:fortify", "world_combat:prepare", "world_combat:travel-help", "world_combat:worksite", "world_combat:observe", "world_combat:command");
                Object.keys(orderRules).forEach(id => orderRules[id](context, order));
                for (var i = 0; i < order.length; i++) {
                    var matching = choices.filter(function (choice) { return choice.goal.kind === order[i]; });
                    if (!matching.length)
                        continue;
                    var retained = matching.filter(function (choice) { return context.active && choice.key === context.active.key; })[0];
                    var preferred = matching[0];
                    if (retained && choicePriority(context, retained) >= choicePriority(context, preferred)) preferred = retained;
                    return { key: preferred.key, transition: "suspend" };
                }
                return decision;
            } });
}
