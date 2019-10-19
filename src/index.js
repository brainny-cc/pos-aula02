const { ApolloServer, gql, PubSub } = require('apollo-server')
const Sequelize = require('./database')
const Writer = require('./models/writer')
const Book = require('./models/book')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const AuthDirective = require('./directives/auth')

const pubSub = new PubSub()

const typeDefs = gql`
    enum RoleEnum {
        USER
        WRITER
    }

    directive @auth(
        role: RoleEnum
    ) on OBJECT | FIELD_DEFINITION

    enum Genres {
        COMEDY
        DRAMA
        FANTASY
        ACTION
        ADVENTURE
        HORROR
        ROMANCE
    }


    type Writer {
        id: ID! 
        firstname: String!
        lastname: String!
        initials: String
        birthday: String
        gender: String
        phone: String
        email: String!
        password: String!
        role: RoleEnum
        books: [Book]
    }

    type Book {
        id: ID!
        title: String!
        ISBN: Int!
        publicationDate: String!
        genre: Genres
        writer: Writer!
    }

    type Query {
        allBooks: [Book]
        allWriters: [Writer]
    }

    type Mutation {
        createBook(data: CreateBookInput): Book @auth(role: WRITER)
        updateBook(id: ID! data: UpdateBookInput): Book
        deleteBook(id: ID!): Boolean

        createWriter(data: CreateWriterInput): Writer
        updateWriter(id: ID! data: UpdateWriterInput): Writer
        deleteWriter(id: ID!): Boolean

        signin(
            email: String!
            password: String!
        ): PayloadAuth
    }

    type PayloadAuth {
        token: String!
        writer: Writer!
    }

    type Subscription {
        onCreatedWriter: Writer
    }

    input CreateWriterInput {
        firstname: String!
        lastname: String!
        initials: String
        birthday: String
        gender: String
        phone: String
        email: String!
        password: String!
        role: RoleEnum!
    }

    input UpdateWriterInput {
        firstname: String
        lastname: String
        initials: String
        birthday: String
        gender: String
        phone: String
        email: String
        password: String
        role: RoleEnum
    }

    input CreateBookInput {
        title: String!
        ISBN: Int!
        publicationDate: String!
        genre: Genres
        writer: CreateWriterInput
    }

    input UpdateBookInput {
        title: String
        ISBN: Int
        publicationDate: String
        genre: Genres
    }
`

const resolver = {
    Query: {
        allBooks() {
            return Book.findAll({ include: [Writer] })
        },
        allWriters() {
            return Writer.findAll({ include: [Book] })
        }
    },
    Mutation: {
        async createBook(parent, body, context, info) {
            if (body.data.writer) {
                const [createdWriter, created] =
                    await Writer.findOrCreate(
                        { where: body.data.writer }
                    )
                body.data.writer = null
                const book = await Book.create(body.data)
                await book.setWriter(createdWriter.get('id'))
                return book.reload({ include: [Writer] })

            } else {
                return Book.create(body.data, { include: [Writer] })
            }
        },
        async updateBook(parent, body, context, info) {
            const book = await Book.findOne({
                where: { id: body.id }
            })
            if (!book) {
                throw new Error('Livro não encontrado')
            }
            const updatedBook = await book.update(body.data)
            return updatedBook
        },
        async deleteBook(parent, body, context, info) {
            const book = await Book.findOne({
                where: { id: body.id }
            })
            await book.destroy()
            return true
        },
        async createWriter(parent, body, context, info) {
            body.data.password = await bcrypt.hash(body.data.password, 10)
            const writer = await Writer.create(body.data)
            const reloadedWriter = writer.reload({ include: [Book] })
            pubSub.publish('createdWriter', {
                onCreatedWriter: reloadedWriter
            })
            return reloadedWriter
        },
        async updateWriter(parent, body, context, info) {
            if (body.data.password) {
                body.data.password = await bcrypt.hash(body.data.password, 10)
            }
            const writer = await Writer.findOne({
                where: { id: body.id }
            })
            if (!writer) {
                throw new Error('Autor não encontrado')
            }
            const updateWriter = await writer.update(body.data)
            return updateWriter
        },
        async deleteWriter(parent, body, context, info) {
            const writer = await Writer.findOne({
                where: { id: body.id }
            })
            await writer.destroy()
            return true
        },
        async signin(parent, body, context, info) {
            const writer = await Writer.findOne({
                where: { email: body.email }
            })

            if (writer) {
                const isCorrect = await bcrypt.compare(
                    body.password,
                    writer.password
                )
                if (!isCorrect) {
                    throw new Error('Senha inválida')
                }

                const token = jwt.sign({ id: writer.id }, 'secret')

                return {
                    token,
                    writer
                }
            }
        }
    },
    Subscription: {
        onCreatedWriter: {
            subscribe: () => pubSub.asyncIterator('createdWriter')
        }
    },
    Writer: {
        initials(parent, body, context, info) {
            return parent.firstname[0] + '. ' + parent.lastname[0] + '.'
        }
    }
}

const server = new ApolloServer({
    typeDefs: typeDefs,
    resolvers: resolver,
    schemaDirectives: {
        auth: AuthDirective
    },
    context({ req }) {
        return {
            headers: req.headers
        }
    }
});


Sequelize.sync().then(() => {
    server.listen()
        .then(() => {
            console.log('Servidor rodando')
        })
})
