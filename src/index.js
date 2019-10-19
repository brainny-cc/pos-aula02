const { ApolloServer, gql } = require('apollo-server')
const Sequelize = require('./database')
const Writer = require('./models/writer')
const Book = require('./models/book')


const typeDefs = gql`
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
        createBook(data: CreateBookInput): Book
        updateBook(id: ID! data: UpdateBookInput): Book
        deleteBook(id: ID!): Boolean

        createWriter(data: CreateWriterInput): Writer
        updateWriter(id: ID! data: UpdateWriterInput): Writer
        deleteWriter(id: ID!): Boolean
    }

    input CreateWriterInput {
        firstname: String!
        lastname: String!
        initials: String
        birthday: String
        gender: String
        phone: String
    }

    input UpdateWriterInput {
        firstname: String
        lastname: String
        initials: String
        birthday: String
        gender: String
        phone: String
    }

    input CreateBookInput {
        title: String!
        ISBN: Int!
        publicationDate: String!
        genre: Genres
        writer: CreateWriterInput!
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
            const [createdWriter, created] =
                await Writer.findOrCreate(
                    { where: body.data.writer }
                )
            body.data.writer = null
            const book = await Book.create(body.data)
            await book.setWriter(createdWriter.get('id'))

            return book.reload({ include: [Writer] })
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
            const writer = await Writer.create(body.data)
            return writer.reload({ include: [Book] })
        },
        async updateWriter(parent, body, context, info) {
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
    },
    Writer: {
        initials(parent, body, context, info) {
            return parent.firstname[0] + '. ' + parent.lastname[0] + '.'
        }
    }
}

const server = new ApolloServer({
    typeDefs: typeDefs,
    resolvers: resolver
});


Sequelize.sync().then(() => {
    server.listen()
        .then(() => {
            console.log('Servidor rodando')
        })
})
