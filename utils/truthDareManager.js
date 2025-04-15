const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');

class TruthDareManager {
    constructor(client) {
        this.client = client;
        this.dataPath = path.join(__dirname, '../data/truthDare.json');
        this.loadQuestions();
    }
    
    /**
     * Load saved truth or dare questions from the data file
     */
    loadQuestions() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
                this.truthQuestions = data.truthQuestions || this.getDefaultTruthQuestions();
                this.dareQuestions = data.dareQuestions || this.getDefaultDareQuestions();
                
                console.log(`Loaded ${this.truthQuestions.length} truth questions and ${this.dareQuestions.length} dare questions.`);
            } else {
                // Initialize with default questions
                this.truthQuestions = this.getDefaultTruthQuestions();
                this.dareQuestions = this.getDefaultDareQuestions();
                this.saveQuestions();
                
                console.log('Created default truth and dare questions.');
            }
        } catch (error) {
            console.error('Error loading truth or dare questions:', error);
            // Initialize with defaults if loading fails
            this.truthQuestions = this.getDefaultTruthQuestions();
            this.dareQuestions = this.getDefaultDareQuestions();
        }
    }
    
    /**
     * Save questions to the data file
     */
    saveQuestions() {
        try {
            const data = {
                truthQuestions: this.truthQuestions,
                dareQuestions: this.dareQuestions
            };
            
            fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving truth or dare questions:', error);
        }
    }
    
    /**
     * Get default truth questions
     * @returns {Array<string>} Default truth questions
     */
    getDefaultTruthQuestions() {
        return [
            "What's the most embarrassing thing you've ever done?",
            "What's one secret you've never told anyone?",
            "What's your biggest fear?",
            "What's the worst thing you've ever done?",
            "What's the biggest mistake you've made?",
            "What's one thing you wish you could change about yourself?",
            "Who do you have a crush on?",
            "What's the most embarrassing thing in your search history?",
            "What's the most childish thing you still do?",
            "What's the worst lie you've ever told?",
            "What's the worst grade you've received?",
            "What's one thing you'd change about your appearance?",
            "What's the most trouble you've been in?",
            "What's something you've done that you're most proud of?",
            "What's your biggest insecurity?",
            "What's your biggest regret?",
            "What's the last lie you told?",
            "What's the weirdest thought you've had?",
            "What's the worst advice you've given?",
            "What's the worst advice you've taken?"
        ];
    }
    
    /**
     * Get default dare questions
     * @returns {Array<string>} Default dare questions
     */
    getDefaultDareQuestions() {
        return [
            "Send a message to a random person in your contacts.",
            "Do your best impression of someone in this server.",
            "Send your most recent photo in your camera roll.",
            "Make up a song about a person on your right.",
            "Tell a joke without laughing.",
            "Speak in an accent for the next 10 minutes.",
            "Call someone and sing them Happy Birthday.",
            "Show the most embarrassing photo on your phone.",
            "Let the group post a status on one of your social media accounts.",
            "Do 20 jumping jacks.",
            "Keep your eyes closed until your next turn.",
            "Say something in another language.",
            "Give a compliment to each person in the chat.",
            "Send a selfie with a silly face.",
            "Text your crush and tell them you're thinking about them.",
            "Eat a spoonful of hot sauce or something spicy.",
            "Tell the group your most embarrassing memory.",
            "Speak in rhymes for the next two minutes.",
            "Call a friend and pretend you dialed the wrong number.",
            "Change your profile picture to whatever the group chooses for a day."
        ];
    }
    
    /**
     * Add a new question to the collection
     * @param {string} type - 'truth' or 'dare'
     * @param {string} question - The question to add
     * @returns {boolean} Whether the question was added
     */
    addQuestion(type, question) {
        if (!question || question.trim() === '') {
            return false;
        }
        
        if (type === 'truth') {
            if (!this.truthQuestions.includes(question)) {
                this.truthQuestions.push(question);
                this.saveQuestions();
                return true;
            }
        } else if (type === 'dare') {
            if (!this.dareQuestions.includes(question)) {
                this.dareQuestions.push(question);
                this.saveQuestions();
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get a random question
     * @param {string} type - 'truth' or 'dare'
     * @returns {string} A random question
     */
    getRandomQuestion(type) {
        if (type === 'truth') {
            const randomIndex = Math.floor(Math.random() * this.truthQuestions.length);
            return this.truthQuestions[randomIndex];
        } else if (type === 'dare') {
            const randomIndex = Math.floor(Math.random() * this.dareQuestions.length);
            return this.dareQuestions[randomIndex];
        }
        
        return 'No questions available.';
    }
    
    /**
     * Start a new Truth or Dare game
     * @param {Object} options - Game options
     * @returns {Promise<Message>} The sent message
     */
    async startGame(channel) {
        try {
            // Create Truth or Dare buttons
            const truthButton = new ButtonBuilder()
                .setCustomId('truth_button')
                .setLabel('Truth')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🤔');
                
            const dareButton = new ButtonBuilder()
                .setCustomId('dare_button')
                .setLabel('Dare')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔥');
                
            const addQuestionButton = new ButtonBuilder()
                .setCustomId('add_question')
                .setLabel('Add Your Question')
                .setStyle(ButtonStyle.Success)
                .setEmoji('➕');
                
            const row = new ActionRowBuilder()
                .addComponents(truthButton, dareButton, addQuestionButton);
                
            // Create game embed
            const embed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('Truth or Dare')
                .setDescription('Choose "Truth" to answer a personal question, or "Dare" to perform a challenge!')
                .addFields(
                    { 
                        name: 'How to Play', 
                        value: 'Click a button below to get a random truth question or dare challenge. You can also add your own questions!'
                    }
                )
                .setFooter({ 
                    text: `Truth: ${this.truthQuestions.length} questions | Dare: ${this.dareQuestions.length} questions`,
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();
                
            // Send the game message
            return await channel.send({ 
                embeds: [embed], 
                components: [row] 
            });
        } catch (error) {
            console.error('Error starting Truth or Dare game:', error);
            throw error;
        }
    }
    
    /**
     * Handle button interaction for Truth or Dare
     * @param {Interaction} interaction - The button interaction
     */
    async handleButtonInteraction(interaction) {
        try {
            if (interaction.customId === 'truth_button') {
                await this.handleTruthButton(interaction);
            } else if (interaction.customId === 'dare_button') {
                await this.handleDareButton(interaction);
            } else if (interaction.customId === 'add_question') {
                await this.handleAddQuestionButton(interaction);
            }
        } catch (error) {
            console.error('Error handling Truth or Dare button:', error);
            try {
                // Try to respond if we haven't already
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: 'There was an error processing your request. Please try again.', 
                        ephemeral: true 
                    });
                }
            } catch (replyError) {
                console.error('Error replying to interaction:', replyError);
            }
        }
    }
    
    /**
     * Handle Truth button press
     * @param {Interaction} interaction - The button interaction
     */
    async handleTruthButton(interaction) {
        // Get a random truth question
        const question = this.getRandomQuestion('truth');
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('Truth Question')
            .setDescription(question)
            .setFooter({ 
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();
            
        // Create buttons for the next round
        const truthButton = new ButtonBuilder()
            .setCustomId('truth_button')
            .setLabel('Another Truth')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🤔');
            
        const dareButton = new ButtonBuilder()
            .setCustomId('dare_button')
            .setLabel('Try a Dare')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔥');
            
        const addQuestionButton = new ButtonBuilder()
            .setCustomId('add_question')
            .setLabel('Add Question')
            .setStyle(ButtonStyle.Success)
            .setEmoji('➕');
            
        const row = new ActionRowBuilder()
            .addComponents(truthButton, dareButton, addQuestionButton);
            
        // Respond with the question
        await interaction.reply({ 
            embeds: [embed],
            components: [row]
        });
    }
    
    /**
     * Handle Dare button press
     * @param {Interaction} interaction - The button interaction
     */
    async handleDareButton(interaction) {
        // Get a random dare challenge
        const challenge = this.getRandomQuestion('dare');
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('Dare Challenge')
            .setDescription(challenge)
            .setFooter({ 
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();
            
        // Create buttons for the next round
        const truthButton = new ButtonBuilder()
            .setCustomId('truth_button')
            .setLabel('Try a Truth')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🤔');
            
        const dareButton = new ButtonBuilder()
            .setCustomId('dare_button')
            .setLabel('Another Dare')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔥');
            
        const addQuestionButton = new ButtonBuilder()
            .setCustomId('add_question')
            .setLabel('Add Question')
            .setStyle(ButtonStyle.Success)
            .setEmoji('➕');
            
        const row = new ActionRowBuilder()
            .addComponents(truthButton, dareButton, addQuestionButton);
            
        // Respond with the challenge
        await interaction.reply({ 
            embeds: [embed],
            components: [row]
        });
    }
    
    /**
     * Handle Add Question button press
     * @param {Interaction} interaction - The button interaction
     */
    async handleAddQuestionButton(interaction) {
        // Create modal for adding a question
        const modal = new ModalBuilder()
            .setCustomId('add_question_modal')
            .setTitle('Add a Truth or Dare Question');
            
        // Create dropdown for question type
        const typeInput = new TextInputBuilder()
            .setCustomId('question_type')
            .setLabel('Type (truth or dare)')
            .setPlaceholder('Enter "truth" or "dare"')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
            
        const questionInput = new TextInputBuilder()
            .setCustomId('question_text')
            .setLabel('Your Question or Challenge')
            .setPlaceholder('Enter your truth question or dare challenge here')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);
            
        // Add inputs to the modal
        const typeRow = new ActionRowBuilder().addComponents(typeInput);
        const questionRow = new ActionRowBuilder().addComponents(questionInput);
        modal.addComponents(typeRow, questionRow);
        
        // Show the modal
        await interaction.showModal(modal);
    }
    
    /**
     * Handle modal submission for adding questions
     * @param {Interaction} interaction - The modal interaction
     */
    async handleModalSubmission(interaction) {
        try {
            if (interaction.customId === 'add_question_modal') {
                // Get the values from the modal
                const type = interaction.fields.getTextInputValue('question_type').toLowerCase().trim();
                const question = interaction.fields.getTextInputValue('question_text').trim();
                
                // Validate type
                if (type !== 'truth' && type !== 'dare') {
                    await interaction.reply({ 
                        content: 'Invalid question type. Please use "truth" or "dare".',
                        ephemeral: true
                    });
                    return;
                }
                
                // Add the question
                const added = this.addQuestion(type, question);
                
                if (added) {
                    await interaction.reply({ 
                        content: `Your ${type} question has been added successfully!`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({ 
                        content: 'This question already exists or is invalid.',
                        ephemeral: true
                    });
                }
            }
        } catch (error) {
            console.error('Error handling modal submission:', error);
            try {
                if (!interaction.replied) {
                    await interaction.reply({ 
                        content: 'There was an error processing your question. Please try again.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Error replying to modal submission:', replyError);
            }
        }
    }
}

module.exports = TruthDareManager;